import { initialData } from "../lib/touchline/model";
import { notebookSchema } from "../lib/touchline/validation";
import { NotebookConflict, type NotebookSnapshot, type NotebookStore } from "../lib/touchline/notebook-store";

const DATABASE = "touchline-github-pages-v1";
const TABLE = "notebooks";
const KEY = "personal";

function storageError() {
  return new Error("This browser could not save your notebook. Allow browser storage and retry, or download your edits as a backup.");
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    try {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(TABLE);
      request.onerror = () => { settled = true; reject(storageError()); };
      request.onblocked = () => {
        settled = true;
        reject(new Error("Close other Touchline tabs, then retry opening browser storage."));
      };
      request.onsuccess = () => {
        if (settled) { request.result.close(); return; }
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
    } catch { reject(storageError()); }
  });
}

function decode(value: unknown): NotebookSnapshot {
  if (value === undefined) return { data: structuredClone(initialData), revision: 0 };
  const record = value as Partial<NotebookSnapshot> | null;
  if (!record || !Number.isSafeInteger(record.revision) || (record.revision ?? 0) < 1) {
    throw new Error("The saved browser notebook could not be read. It has not been replaced.");
  }
  return { data: notebookSchema.parse(record.data), revision: record.revision! };
}

export const browserNotebookStore: NotebookStore = {
  kind: "browser",
  async load(signal) {
    const db = await openDatabase();
    if (signal?.aborted) { db.close(); throw new DOMException("Aborted", "AbortError"); }
    return new Promise<NotebookSnapshot>((resolve, reject) => {
      const tx = db.transaction(TABLE, "readonly");
      const request = tx.objectStore(TABLE).get(KEY);
      let snapshot: NotebookSnapshot;
      let failure: unknown;
      request.onsuccess = () => {
        try { snapshot = decode(request.result); }
        catch (error) { failure = error; tx.abort(); }
      };
      tx.oncomplete = () => { db.close(); resolve(snapshot); };
      tx.onabort = tx.onerror = () => { db.close(); reject(failure || storageError()); };
    });
  },
  async save(data, revision) {
    const valid = notebookSchema.parse(data);
    const db = await openDatabase();
    return new Promise<{ revision: number }>((resolve, reject) => {
      // The read and write share one transaction, so simultaneous tabs cannot
      // both accept the same revision and silently replace each other's edits.
      const tx = db.transaction(TABLE, "readwrite");
      const table = tx.objectStore(TABLE);
      const request = table.get(KEY);
      let failure: unknown;
      request.onsuccess = () => {
        try {
          const current = decode(request.result);
          if (current.revision !== revision) {
            throw new NotebookConflict("This notebook changed in another tab. Keep your edits as recovery copies to preserve both versions.");
          }
          table.put({ data: valid, revision: revision + 1 }, KEY);
        } catch (error) { failure = error; tx.abort(); }
      };
      tx.oncomplete = () => { db.close(); resolve({ revision: revision + 1 }); };
      tx.onabort = tx.onerror = () => { db.close(); reject(failure || storageError()); };
    });
  },
};

import type { NotebookData } from "./model";
import { z } from "zod";
import { notebookSchema } from "./validation";

const revisionSchema = z.object({ revision: z.number().int().nonnegative() });
const snapshotSchema = revisionSchema.extend({ data: notebookSchema });

export type NotebookSnapshot = { data: NotebookData; revision: number };
export interface NotebookStore {
  kind: "account" | "browser";
  load(signal?: AbortSignal): Promise<NotebookSnapshot>;
  save(data: NotebookData, revision: number): Promise<{ revision: number }>;
}

export class NotebookConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotebookConflict";
  }
}

async function responseBody(response: Response) {
  const body = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(body);
    const message = error.success ? error.data.error : "Notebook storage is unavailable.";
    if (response.status === 409) throw new NotebookConflict(message);
    throw new Error(message);
  }
  return body;
}

export const accountNotebookStore: NotebookStore = {
  kind: "account",
  async load(signal) {
    return snapshotSchema.parse(await responseBody(await fetch("/api/notebook", { cache: "no-store", signal })));
  },
  async save(data, revision) {
    return revisionSchema.parse(await responseBody(await fetch("/api/notebook", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision, data }),
    })));
  },
};

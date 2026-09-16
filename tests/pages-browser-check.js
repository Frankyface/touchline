// Run through agent-browser eval --stdin on the local Vite Pages dev server.
// Uses real IndexedDB and restores the original local record in finally.
(async () => {
  if (!["localhost", "127.0.0.1"].includes(location.hostname)) {
    throw new Error("This test only runs on a disposable local preview.");
  }
  const { browserNotebookStore: store } = await import("/touchline/browser-store.ts");
  const assert = (ok, label) => { if (!ok) throw new Error(label); };
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open("touchline-github-pages-v1", 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const rawRead = () => new Promise((resolve, reject) => {
    const tx = db.transaction("notebooks", "readonly");
    const req = tx.objectStore("notebooks").get("personal");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const rawWrite = (value) => new Promise((resolve, reject) => {
    const tx = db.transaction("notebooks", "readwrite");
    const table = tx.objectStore("notebooks");
    if (value === undefined) table.delete("personal");
    else table.put(value, "personal");
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error);
  });
  const original = await rawRead();
  const passed = [];
  try {
    const start = await store.load();
    const draft = structuredClone(start.data);
    draft.plays[0].title = "Pages storage regression";
    const saved = await store.save(draft, start.revision);
    const reloaded = await store.load();
    assert(reloaded.revision === saved.revision && reloaded.data.plays[0].title === draft.plays[0].title, "durable roundtrip");
    passed.push("durable roundtrip");

    const competing = await Promise.allSettled([
      store.save(draft, saved.revision), store.save(draft, saved.revision),
    ]);
    assert(competing.filter((x) => x.status === "fulfilled").length === 1, "exactly one writer wins");
    assert(competing.find((x) => x.status === "rejected").reason.name === "NotebookConflict", "loser reports conflict");
    passed.push("atomic competing-tab writes");
    const current = await store.load();

    const invalid = structuredClone(draft);
    invalid.plays[0].title = "";
    let rejected = false;
    try { await store.save(invalid, current.revision); } catch { rejected = true; }
    assert(rejected && (await store.load()).revision === current.revision, "invalid data must not save");
    passed.push("invalid data rejected without replacement");

    const realPut = IDBObjectStore.prototype.put;
    try {
      IDBObjectStore.prototype.put = function () { throw new DOMException("Simulated quota limit", "QuotaExceededError"); };
      rejected = false;
      try { await store.save(draft, current.revision); } catch { rejected = true; }
      assert(rejected, "quota failure must reject");
    } finally { IDBObjectStore.prototype.put = realPut; }
    assert((await store.load()).revision === current.revision, "quota failure must preserve data");
    passed.push("quota failure preserves saved data");

    const realOpen = IDBFactory.prototype.open;
    try {
      IDBFactory.prototype.open = function () { throw new DOMException("Simulated blocked storage", "SecurityError"); };
      rejected = false;
      try { await store.load(); } catch { rejected = true; }
      assert(rejected, "unavailable storage must reject");
    } finally { IDBFactory.prototype.open = realOpen; }
    passed.push("unavailable storage reports failure");

    const corrupt = { revision: current.revision, data: { broken: true } };
    await rawWrite(corrupt);
    rejected = false;
    try { await store.load(); } catch { rejected = true; }
    assert(rejected, "corrupt data must fail loading");
    rejected = false;
    try { await store.save(draft, current.revision); } catch { rejected = true; }
    assert(rejected && JSON.stringify(await rawRead()) === JSON.stringify(corrupt), "corrupt data must not be replaced");
    passed.push("corrupt record retained for recovery");
    return { passed: passed.length, checks: passed };
  } finally {
    await rawWrite(original);
    db.close();
  }
})()

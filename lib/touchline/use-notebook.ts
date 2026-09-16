"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { initialData, mergeRecovery, type NotebookData } from "./model";
import { notebookSchema } from "./validation";
import { accountNotebookStore, NotebookConflict, type NotebookStore } from "./notebook-store";

export function useNotebook(store: NotebookStore = accountNotebookStore) {
  const savedStatus = store.kind === "browser" ? "Saved in this browser" : "All changes saved";
  const [data, setData] = useState<NotebookData>(initialData),
    [ready, setReady] = useState(false),
    [status, setStatus] = useState("Loading notebook…"),
    [error, setError] = useState("");
  const latest = useRef(data),
    saved = useRef(""),
    revision = useRef(0),
    conflict = useRef(false),
    mounted = useRef(true),
    loading = useRef(false),
    generation = useRef(0),
    loadController = useRef<AbortController | null>(null),
    inFlight = useRef<Promise<void> | null>(null);
  latest.current = data;
  const load = useCallback(async (mode: "replace" | "recover" = "replace") => {
    const hadData = saved.current !== "";
    const gen = ++generation.current;
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    loading.current = true;
    setReady(false);
    setError("");
    setStatus("Loading notebook…");
    try {
      // Let an already-sent write finish before asking the server for its current revision.
      if (inFlight.current) await inFlight.current;
      if (gen !== generation.current || !mounted.current) return;
      const body = await store.load(controller.signal);
      const valid = notebookSchema.parse(body.data);
      if (gen !== generation.current || !mounted.current) return;
      let next: NotebookData = valid;
      if (mode === "recover") {
        if (!notebookSchema.safeParse(latest.current).success)
          throw new Error(
            "Complete required fields before recovering your edits. Your draft is still here.",
          );
        const merged = mergeRecovery(valid, latest.current);
        if (!notebookSchema.safeParse(merged).success)
          throw new Error(
            "Recovery copies would exceed the notebook limits. Your draft is still here; download a backup before making room.",
          );
        next = merged;
      }
      revision.current = body.revision;
      saved.current = JSON.stringify(valid);
      latest.current = next;
      conflict.current = false;
      setData(next);
      setReady(true);
      setStatus(
        JSON.stringify(next) === saved.current
          ? savedStatus
          : "Unsaved changes",
      );
      setError("");
    } catch (e) {
      if (
        controller.signal.aborted ||
        gen !== generation.current ||
        !mounted.current
      )
        return;
      setError(e instanceof Error ? e.message : "Unable to load notebook");
      setStatus("Could not load notebook");
      if (hadData) setReady(true);
    } finally {
      if (gen === generation.current) loading.current = false;
    }
  }, [store, savedStatus]);
  const flush = useCallback(async () => {
    if (
      inFlight.current ||
      conflict.current ||
      loading.current ||
      !mounted.current
    )
      return;
    const snapshot = latest.current,
      json = JSON.stringify(snapshot);
    if (json === saved.current) return;
    if (!notebookSchema.safeParse(snapshot).success) {
      setStatus("Complete required fields to save");
      return;
    }
    setStatus("Saving…");
    let success = false;
    const request = (async () => {
      try {
        const body = await store.save(snapshot, revision.current);
        revision.current = body.revision;
        saved.current = json;
        success = true;
        if (mounted.current && !loading.current) {
          setError("");
          setStatus(
            JSON.stringify(latest.current) === json
              ? savedStatus
              : "Unsaved changes",
          );
        }
      } catch (e) {
        if (e instanceof NotebookConflict) conflict.current = true;
        if (mounted.current && !loading.current) {
          setError(e instanceof Error ? e.message : "Saving failed");
          setStatus("Changes not saved");
        }
      }
    })();
    inFlight.current = request;
    await request;
    inFlight.current = null;
    if (
      success &&
      mounted.current &&
      !loading.current &&
      JSON.stringify(latest.current) !== saved.current
    )
      setTimeout(() => void flush(), 300);
  }, [store, savedStatus]);
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      loadController.current?.abort();
    };
  }, [load]);
  useEffect(() => {
    if (!ready || JSON.stringify(data) === saved.current) return;
    if (!conflict.current) setStatus("Unsaved changes");
    const timer = setTimeout(() => void flush(), 700);
    return () => clearTimeout(timer);
  }, [data, ready, flush]);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(latest.current) !== saved.current && saved.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, []);
  return {
    data,
    setData,
    ready,
    status,
    error,
    canRetry: !conflict.current,
    reload: load,
    recover: () => load("recover"),
    retry: () => {
      if (conflict.current) return;
      if (ready) void flush();
      else void load();
    },
  };
}

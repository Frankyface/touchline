"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Copy,
  Download,
  HelpCircle,
  Plus,
  Route,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Star,
  CalendarPlus,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  firstPlay,
  uid,
  restoreRemoved,
  restoreBlock,
  blockFromPlay,
  repeatSession,
  equipmentList,
  type Play,
  type Session,
  type NotebookData,
} from "@/lib/touchline/model";
import { notebookBackup, notebookSizeError } from "@/lib/touchline/recording";
import { notebookSchema } from "@/lib/touchline/validation";
import { useNotebook } from "@/lib/touchline/use-notebook";
import type { NotebookStore } from "@/lib/touchline/notebook-store";
import { downloadFile } from "@/lib/touchline/export";
import { Pitch } from "./pitch";
import { Editor } from "./editor";
import { Sessions } from "./sessions";
import { SessionRunner } from "./session-runner";
import { starters, createFromStarter } from "@/lib/touchline/templates";

type DeleteItem = { type: "play" | "session"; id: string; title: string };
export default function Notebook({ store, homeHref = "/" }: { store?: NotebookStore; homeHref?: string }) {
  const browserOnly = store?.kind === "browser";
  const { data, setData, ready, status, error, canRetry, retry, recover } =
    useNotebook(store);
  const [tab, setTab] = useState("board"),
    [selected, setSelected] = useState(firstPlay.id),
    [query, setQuery] = useState(""),
    [newOpen, setNewOpen] = useState(false),
    [newName, setNewName] = useState(""),
    [starterId, setStarterId] = useState("overload"),
    [categoryFilter, setCategoryFilter] = useState("all"),
    [favoritesOnly, setFavoritesOnly] = useState(false),
    [sort, setSort] = useState("recent"),
    [selectedSession, setSelectedSession] = useState(""),
    [addingPlay, setAddingPlay] = useState<Play | null>(null),
    [addTarget, setAddTarget] = useState("new"),
    [runner, setRunner] = useState<{
      session: Session;
      plays: Play[];
      open: boolean;
    } | null>(null),
    [switchRun, setSwitchRun] = useState<Session | null>(null),
    [helpOpen, setHelpOpen] = useState(false),
    [deleting, setDeleting] = useState<DeleteItem | null>(null),
    [print, setPrint] = useState<{ play?: Play; session?: Session } | null>(
      null,
    );
  const importInput = useRef<HTMLInputElement>(null);
  const current = useRef(data);
  current.current = data;
  const play = data.plays.find((p) => p.id === selected) ?? data.plays[0];
  const starter = starters.find((s) => s.id === starterId) ?? starters[0];
  const editSession = (id: string, patch: Partial<Session>) =>
    setData((d) => ({
      ...d,
      sessions: d.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  const startRunner = (s: Session) => {
    if (runner?.session.id === s.id) {
      setRunner({ ...runner, open: true });
      return;
    }
    if (runner) {
      setSwitchRun(s);
      return;
    }
    setRunner({
      session: structuredClone(s),
      plays: structuredClone(data.plays),
      open: true,
    });
  };
  const chooseSession = (p: Play) => {
    setAddingPlay(p);
    setAddTarget(
      data.sessions.find((s) => s.id === selectedSession && !s.completedAt)
        ?.id ??
        data.sessions.find((s) => !s.completedAt)?.id ??
        "new",
    );
  };
  const addPlayToSession = () => {
    if (!addingPlay || !ready) return;
    const existing = data.sessions.find((s) => s.id === addTarget);
    if (
      (existing && existing.blocks.length >= 50) ||
      (!existing && data.sessions.length >= 50)
    ) {
      toast.error("This notebook has reached its session or block limit.");
      return;
    }
    const target: Session = existing ?? {
      id: uid(),
      title: "The next session",
      date: "",
      players: 12,
      targetMinutes: 60,
      blocks: [],
    };
    const next = {
      ...target,
      blocks: [...target.blocks, blockFromPlay(addingPlay)],
    };
    setData((d) => ({
      ...d,
      sessions: existing
        ? d.sessions.map((s) => (s.id === next.id ? next : s))
        : [...d.sessions, next],
    }));
    setSelectedSession(next.id);
    setAddingPlay(null);
    toast.success(`Added to ${next.title}`, {
      action: {
        label: "View session",
        onClick: () => {
          setTab("session");
          setSelectedSession(next.id);
        },
      },
    });
  };
  const removeBlock = (sessionId: string, blockId: string) => {
    const s = data.sessions.find((s) => s.id === sessionId);
    const index = s?.blocks.findIndex((b) => b.id === blockId) ?? -1;
    const block = s?.blocks[index];
    if (!s || !block) return;
    editSession(sessionId, {
      blocks: s.blocks.filter((b) => b.id !== blockId),
    });
    toast("Practice block removed", {
      duration: 8000,
      action: {
        label: "Undo",
        onClick: () =>
          setData((d) => ({
            ...d,
            sessions: d.sessions.map((s) =>
              s.id === sessionId
                ? restoreBlock(
                    s,
                    {
                      ...block,
                      playId: d.plays.some((p) => p.id === block.playId)
                        ? block.playId
                        : undefined,
                    },
                    index,
                  )
                : s,
            ),
          })),
      },
    });
  };
  const updatePlay = (p: Play) =>
    setData((d) => ({
      ...d,
      plays: d.plays.map((x) => (x.id === p.id ? p : x)),
    }));
  const openPlay = (id: string) => {
    setSelected(id);
    setTab("board");
  };
  const backup = () =>
    downloadFile(
      notebookBackup(data),
      "touchline-notebook-" + new Date().toISOString().slice(0, 10) + ".json",
      "application/json",
    );
  const createPlay = (name: string) => {
    if (!ready || data.plays.length >= 100) return;
    const p = createFromStarter(starter, name);
    setData((d) => ({ ...d, plays: [...d.plays, p] }));
    openPlay(p.id);
    setNewOpen(false);
    setNewName("");
    toast.success("Play created");
  };
  const duplicate = (p: Play) => {
    if (data.plays.length >= 100)
      return toast.error("Your playbook holds up to 100 plays.");
    const copy = {
      ...structuredClone(p),
      id: uid(),
      title: (p.title + " — variation").slice(0, 100),
      updatedAt: new Date().toISOString(),
    };
    const sizeError = notebookSizeError({ ...current.current, plays: [...current.current.plays, copy] });
    if (sizeError) return toast.error(sizeError);
    setData((d) => ({ ...d, plays: [...d.plays, copy] }));
    openPlay(copy.id);
    toast.success("Variation created");
  };
  const newSession = () => {
    if (data.sessions.length >= 50) return;
    const s: Session = {
      id: uid(),
      title: "The next session",
      date: "",
      players: 12,
      targetMinutes: 60,
      blocks: [],
    };
    setData((d) => ({ ...d, sessions: [...d.sessions, s] }));
    setSelectedSession(s.id);
    setTab("session");
  };
  const duplicateSession = (s: Session) => {
    if (data.sessions.length >= 50) return;
    const copy = repeatSession(s);
    const sizeError = notebookSizeError({ ...current.current, sessions: [...current.current.sessions, copy] });
    if (sizeError) return toast.error(sizeError);
    setData((d) => ({
      ...d,
      sessions: [...d.sessions, copy],
    }));
    setSelectedSession(copy.id);
    setTab("session");
    toast.success("Fresh plan created, with your next-time note");
  };
  const remove = () => {
    if (!deleting) return;
    if (deleting.type === "session" && runner?.session.id === deleting.id)
      setRunner(null);
    const previous = data;
    if (deleting.type === "play")
      setData((d) => ({
        ...d,
        plays: d.plays.filter((p) => p.id !== deleting.id),
        sessions: d.sessions.map((s) => ({
          ...s,
          blocks: s.blocks.map((b) =>
            b.playId === deleting.id ? { ...b, playId: undefined } : b,
          ),
        })),
      }));
    else
      setData((d) => ({
        ...d,
        sessions: d.sessions.filter((s) => s.id !== deleting.id),
      }));
    setDeleting(null);
    toast("Removed from notebook", {
      action: {
        label: "Undo",
        onClick: () =>
          setData((now) =>
            restoreRemoved(now, previous, deleting.type, deleting.id),
          ),
      },
      duration: 7000,
    });
  };
  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 2000000)
        throw new Error("Choose a backup smaller than 2 MB.");
      const raw = JSON.parse(await file.text());
      if (raw.format !== "touchline-notebook" || raw.version !== 1)
        throw new Error("Choose a Touchline notebook backup.");
      const imported = notebookSchema.parse(raw.data);
      const ids = new Map(imported.plays.map((p) => [p.id, uid()]));
      const merged: NotebookData = {
        plays: [
          ...current.current.plays,
          ...imported.plays.map((p) => ({
            ...p,
            id: ids.get(p.id)!,
            title: (p.title + " (imported)").slice(0, 100),
          })),
        ],
        sessions: [
          ...current.current.sessions,
          ...imported.sessions.map((s) => ({
            ...s,
            id: uid(),
            blocks: s.blocks.map((b) => ({
              ...b,
              id: uid(),
              playId: b.playId ? ids.get(b.playId) : undefined,
            })),
          })),
        ],
      };
      notebookSchema.parse(merged);
      const sizeError = notebookSizeError(merged);
      if (sizeError) throw new Error(sizeError);
      setData(merged);
      toast.success("Backup added to your notebook");
    } catch (e) {
      toast.error(
        e instanceof Error && !("issues" in e)
          ? e.message
          : "This backup is invalid or exceeds the notebook limits.",
      );
    } finally {
      if (importInput.current) importInput.current.value = "";
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools = [
      {
        name: "read_touchline_notebook",
        title: "Read rugby notebook",
        description:
          "List the saved play names and session durations currently shown in this notebook.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async (input: unknown) => {
          if (!input || typeof input !== "object" || Object.keys(input).length)
            throw new Error("Expected an empty object");
          return {
            plays: current.current.plays.map((p) => ({
              id: p.id,
              title: p.title,
              category: p.category,
            })),
            sessions: current.current.sessions.map((s) => ({
              id: s.id,
              title: s.title,
              minutes: s.blocks.reduce((n, b) => n + b.minutes, 0),
            })),
          };
        },
      },
      {
        name: "open_touchline_play",
        title: "Open rugby play",
        description:
          "Open an existing play on the drawing board. This does not modify saved data.",
        inputSchema: {
          type: "object",
          properties: { playId: { type: "string" } },
          required: ["playId"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async (input: unknown) => {
          if (
            !input ||
            typeof input !== "object" ||
            Object.keys(input).some((k) => k !== "playId") ||
            typeof (input as { playId?: unknown }).playId !== "string"
          )
            throw new Error("A playId is required");
          const id = (input as { playId: string }).playId;
          const found = current.current.plays.find((p) => p.id === id);
          if (!found) throw new Error("Play not found");
          openPlay(id);
          await new Promise((resolve) =>
            requestAnimationFrame(() => resolve(null)),
          );
          return { id, title: found.title, view: "board" };
        },
      },
    ];
    for (const tool of tools) {
      try {
        Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => lifecycle.abort();
  }, []);
  const filtered = data.plays
    .filter(
      (p) =>
        (!favoritesOnly || p.favorite) &&
        (categoryFilter === "all" || p.category === categoryFilter) &&
        (
          p.title +
          " " +
          p.category +
          " " +
          p.description +
          " " +
          p.cues +
          " " +
          (p.setup ?? "")
        )
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "recent"
          ? b.updatedAt.localeCompare(a.updatedAt)
          : 0,
    );
  return (
    <>
      <div className="app-shell">
        <header className="topbar">
          <a href={homeHref} className="brand">
            <span className="brand-mark">
              <Route size={22} />
            </span>
            touchline<span className="brand-note">THE RUGBY NOTEBOOK</span>
          </a>
          <div className="header-meta">
            <span
              className={"save-status " + (error ? "save-error" : "")}
              role="status"
            >
              {(status === "All changes saved" || status === "Saved in this browser") && <Check size={13} />} {status}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHelpOpen(true)}
              aria-label="How to use Touchline"
            >
              <HelpCircle />
            </Button>
            <span className="avatar">T</span>
          </div>
        </header>
        <main>
          <div className="page-heading workspace-heading">
            <div>
              <h1>Your notebook</h1>
              {browserOnly && <p className="form-note">Saved on this device. Export a backup to keep or move your work.</p>}
            </div>
            <div className="heading-actions">
              {runner && (
                <Button
                  variant="outline"
                  onClick={() => setRunner({ ...runner, open: true })}
                >
                  <Timer />
                  Continue coaching
                </Button>
              )}
              <Button
                className="new-play"
                onClick={() => {
                  setNewName("");
                  setNewOpen(true);
                }}
                disabled={!ready || data.plays.length >= 100}
              >
                <Plus />
                New play
              </Button>
            </div>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <p>{error}</p>
              <div>
                <Button variant="outline" onClick={retry} disabled={!canRetry}>
                  Retry
                </Button>
                <Button variant="outline" onClick={backup}>
                  Download your edits
                </Button>
                <Button
                  variant="ghost"
                  disabled={!ready}
                  onClick={() => void recover()}
                >
                  Keep my edits as copies
                </Button>
              </div>
              <p className="form-note">
                Recovery keeps the latest saved notebook and adds your differing
                plays and sessions as copies. Nothing is overwritten.
              </p>
            </div>
          )}
          <Tabs value={tab} onValueChange={setTab}>
            <div className="section-bar">
              <TabsList variant="line">
                <TabsTrigger value="board">
                  <Route />
                  Drawing board
                </TabsTrigger>
                <TabsTrigger value="book">
                  <BookOpen />
                  Playbook<span className="tab-count">{data.plays.length}</span>
                </TabsTrigger>
                <TabsTrigger value="session">
                  <CalendarDays />
                  Sessions
                </TabsTrigger>
              </TabsList>
              <span className="quiet-note">
                {data.plays.length} plays · {data.sessions.length} sessions
              </span>
            </div>
            <TabsContent value="board">
              <div className="mobile-play-picker">
                <Select value={play?.id ?? ""} onValueChange={openPlay}>
                  <SelectTrigger aria-label="Current play">
                    <SelectValue placeholder="Choose a play" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.plays.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title || "Untitled play"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="workspace full-workspace">
                <aside className="left-panel">
                  <div className="panel-heading">
                    <span>YOUR PLAYS</span>
                    <span>{String(data.plays.length).padStart(2, "0")}</span>
                  </div>
                  {data.plays.map((p, i) => (
                    <button
                      key={p.id}
                      className={
                        "play-list-item " + (p.id === play?.id ? "active" : "")
                      }
                      onClick={() => openPlay(p.id)}
                    >
                      <span className="play-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <strong>{p.title || "Untitled play"}</strong>
                        <small>
                          {p.category} ·{" "}
                          {p.players.filter((x) => x.team === "attack").length}{" "}
                          v{" "}
                          {p.players.filter((x) => x.team === "defence").length}
                        </small>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                  <button
                    className="add-play-link"
                    onClick={() => setNewOpen(true)}
                    disabled={!ready}
                  >
                    <Plus size={15} />A fresh page
                  </button>
                  <div className="notebook-tip">
                    <Sparkles size={20} />
                    <p>Good ideas don’t have to arrive fully formed.</p>
                    <small>
                      Start with a shape.
                      <br />
                      See where it takes you.
                    </small>
                  </div>
                  <div className="sidebar-footer">
                    <Button variant="ghost" onClick={backup}>
                      <Download />
                      Back up notebook
                    </Button>
                  </div>
                </aside>
                {play ? (
                  <Editor
                    play={play}
                    onChange={updatePlay}
                    recordingError={next => notebookSizeError({ ...current.current, plays: current.current.plays.map(p => p.id === next.id ? next : p) })}
                    onDuplicate={() => duplicate(play)}
                    onPrint={() => setPrint({ play })}
                    onAddSession={() => chooseSession(play)}
                    disabled={!ready}
                  />
                ) : (
                  <div className="empty-state">
                    <Route size={32} />
                    <h2>A blank pitch. Endless possibilities.</h2>
                    <p>Your next idea belongs here.</p>
                    <Button onClick={() => setNewOpen(true)} disabled={!ready}>
                      <Plus />
                      Draw your first play
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="book">
              <div className="library-toolbar">
                <div className="search-field">
                  <Search size={17} />
                  <Input
                    aria-label="Search plays"
                    placeholder="Find an idea…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div className="icon-actions">
                  <Button
                    variant="outline"
                    onClick={() => importInput.current?.click()}
                    disabled={!ready}
                  >
                    <Upload />
                    Import backup
                  </Button>
                  <Button variant="outline" onClick={backup}>
                    <Download />
                    Back up
                  </Button>
                </div>
              </div>
              <div className="library-filters">
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger aria-label="Filter play category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["all", "Attack", "Defence", "Set piece", "Skills"].map(
                      (c) => (
                        <SelectItem key={c} value={c}>
                          {c === "all" ? "All categories" : c}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <Button
                  variant={favoritesOnly ? "secondary" : "outline"}
                  aria-pressed={favoritesOnly}
                  onClick={() => setFavoritesOnly(!favoritesOnly)}
                >
                  <Star />
                  Favourites
                </Button>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger aria-label="Sort plays">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recently edited</SelectItem>
                    <SelectItem value="title">Name A–Z</SelectItem>
                    <SelectItem value="original">Original order</SelectItem>
                  </SelectContent>
                </Select>
                <span>
                  {filtered.length} {filtered.length === 1 ? "play" : "plays"}
                </span>
              </div>
              <div className="play-grid">
                {filtered.map((p, i) => (
                  <article className="play-card" key={p.id}>
                    <button
                      className="play-card-preview"
                      onClick={() => openPlay(p.id)}
                      aria-label={"Open " + p.title}
                    >
                      <Pitch play={p} mini />
                    </button>
                    <div className="play-card-content">
                      <div className="card-eyebrow">
                        <span>{p.category}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${p.favorite ? "Unfavourite" : "Favourite"} ${p.title}`}
                          aria-pressed={!!p.favorite}
                          disabled={!ready}
                          onClick={() =>
                            updatePlay({ ...p, favorite: !p.favorite })
                          }
                        >
                          <Star fill={p.favorite ? "currentColor" : "none"} />
                        </Button>
                      </div>
                      <button
                        className="card-title"
                        onClick={() => openPlay(p.id)}
                      >
                        {p.title}
                      </button>
                      <p>{p.description || "An idea waiting to take shape."}</p>
                      <Button
                        className="card-add-session"
                        variant="outline"
                        disabled={!ready}
                        onClick={() => chooseSession(p)}
                      >
                        <CalendarPlus />
                        Add to session
                      </Button>
                      <div className="card-footer">
                        <span>
                          {p.players.filter((x) => x.team !== "cone").length}{" "}
                          players · {p.movements.length} movements
                        </span>
                        <div>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!ready}
                            aria-label={"Duplicate " + p.title}
                            onClick={() => duplicate(p)}
                          >
                            <Copy />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!ready}
                            aria-label={"Delete " + p.title}
                            onClick={() =>
                              setDeleting({
                                type: "play",
                                id: p.id,
                                title: p.title,
                              })
                            }
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
                {!query && categoryFilter === "all" && !favoritesOnly && (
                  <button
                    className="new-play-card"
                    onClick={() => setNewOpen(true)}
                    disabled={!ready || data.plays.length >= 100}
                  >
                    <Plus size={28} />
                    <strong>Leave room for another idea.</strong>
                    <span>Choose a formation or a blank pitch</span>
                  </button>
                )}
              </div>
              {!filtered.length &&
                (query || categoryFilter !== "all" || favoritesOnly) && (
                  <div className="empty-state">
                    <Search size={28} />
                    <h2>No plays found.</h2>
                    <p>Try a different name or category.</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQuery("");
                        setCategoryFilter("all");
                        setFavoritesOnly(false);
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                )}
            </TabsContent>
            <TabsContent value="session">
              <Sessions
                sessions={data.sessions}
                plays={data.plays}
                disabled={!ready}
                selected={selectedSession}
                onSelect={setSelectedSession}
                onRun={startRunner}
                activeRun={runner?.session.id}
                onRemoveBlock={removeBlock}
                onChange={(s) =>
                  setData((d) => ({
                    ...d,
                    sessions: d.sessions.map((x) => (x.id === s.id ? s : x)),
                  }))
                }
                onNew={newSession}
                onDelete={(id) =>
                  setDeleting({
                    type: "session",
                    id,
                    title:
                      data.sessions.find((s) => s.id === id)?.title ??
                      "Session",
                  })
                }
                onDuplicate={duplicateSession}
                onPrint={(session) => setPrint({ session })}
              />
            </TabsContent>
          </Tabs>
          <footer>
            <span>THINK IT. DRAW IT. PLAY IT.</span>
            <span>
              Made for the moments before the whistle.
              <ArrowUpRight size={13} />
            </span>
          </footer>
        </main>
        <input
          ref={importInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Import Touchline backup file"
          onChange={(e) => void importBackup(e.target.files?.[0])}
        />
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogContent className="starter-dialog">
            <DialogTitle>Start with a shape</DialogTitle>
            <DialogDescription>
              Choose a starting point. Every player, line and note is editable.
            </DialogDescription>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPlay(newName || starter.title);
              }}
              className="new-play-form"
            >
              <RadioGroup
                value={starterId}
                onValueChange={setStarterId}
                className="starter-grid"
                aria-label="Starting formation"
              >
                {starters.map((s) => (
                  <label
                    key={s.id}
                    className={
                      "starter-card " + (starterId === s.id ? "selected" : "")
                    }
                    htmlFor={`starter-${s.id}`}
                  >
                    <Pitch play={s.play} mini />
                    <span>
                      <RadioGroupItem id={`starter-${s.id}`} value={s.id} />
                      <strong>{s.title}</strong>
                    </span>
                    <small>{s.detail}</small>
                  </label>
                ))}
              </RadioGroup>
              <label htmlFor="new-play-name">Play name</label>
              <Input
                id="new-play-name"
                autoFocus
                placeholder={starter.title}
                value={newName}
                maxLength={100}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button type="submit" disabled={!ready}>
                Open the drawing board
                <ArrowUpRight />
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog
          open={!!addingPlay}
          onOpenChange={(open) => {
            if (!open) setAddingPlay(null);
          }}
        >
          <DialogContent>
            <DialogTitle>Add “{addingPlay?.title}” to a session</DialogTitle>
            <DialogDescription>
              Copies setup, cues, equipment and adaptations into a 10-minute
              block. Adjust it in the session plan.
            </DialogDescription>
            <Select value={addTarget} onValueChange={setAddTarget}>
              <SelectTrigger aria-label="Destination session">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Create a new session</SelectItem>
                {data.sessions
                  .filter((s) => !s.completedAt)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title} · {s.blocks.length} blocks
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button disabled={!ready} onClick={addPlayToSession}>
              <CalendarPlus />
              Add practice block
            </Button>
          </DialogContent>
        </Dialog>
        <AlertDialog
          open={!!switchRun}
          onOpenChange={(v) => {
            if (!v) setSwitchRun(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Start a different coaching session?
              </AlertDialogTitle>
              <AlertDialogDescription>
                The paused timer for “{runner?.session.title}” will be replaced.
                Its saved plan and reflection stay in your notebook.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep current timer</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (switchRun)
                    setRunner({
                      session: structuredClone(switchRun),
                      plays: structuredClone(data.plays),
                      open: true,
                    });
                  setSwitchRun(null);
                }}
              >
                Start new timer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {runner && (
          <SessionRunner
            key={runner.session.id}
            session={runner.session}
            plays={runner.plays}
            open={runner.open}
            disabled={!ready}
            review={
              data.sessions.find((s) => s.id === runner.session.id)?.review
            }
            onClose={() => setRunner((r) => (r ? { ...r, open: false } : null))}
            onFinish={() =>
              editSession(runner.session.id, {
                completedAt: new Date().toISOString(),
              })
            }
            onReview={(review) => editSession(runner.session.id, { review })}
            onDone={() => {
              setSelectedSession(runner.session.id);
              setTab("session");
              setRunner(null);
            }}
          />
        )}
        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogContent className="help-dialog">
            <DialogTitle>A little room to think.</DialogTitle>
            <DialogDescription>
              Everything starts on the pitch.
            </DialogDescription>
            <div className="help-steps">
              <p>
                <b>01 · Set the scene.</b> Drag players, or choose Attacker,
                Defender or Cone and tap the pitch. Select a player to change
                their label or starting ball.
              </p>
              <p>
                <b>02 · Give it movement.</b> Choose Run, select a player, and
                tap the pitch to draw a route. Keep tapping to extend it. Choose
                Pass and tap the next receiver.
              </p>
              <p>
                <b>Or perform it in Play mode.</b> Choose a clip length, select a
                player, press Play &amp; record, then drag and release. Earlier
                takes replay as you record each teammate. Keep stationary players
                still, then record the ball last. Shape the slate with natural
                paths or polygon edges and a straightening slider. Use this slate
                applies it; Undo restores your previous sequence.
              </p>
              <p>
                <b>03 · Play it through.</b> Use playback or scrub the timeline.
                Passes chain in order. New runs start at the playhead or after
                that player’s last leg. Click an arrow in Move mode or a pencil
                in the sequence to edit timing and endpoints. Use Show play to
                step through moments and focus on one player.
              </p>
              <p>
                <b>04 · Take it outside.</b> Add plays to a session, adjust the
                timing, and open coach mode. Closing pauses the timer and keeps
                your place in this tab. Finish to record a reflection; Plan next
                session carries your next-time note into a fresh plan. Print a
                plan or save it as PDF through your browser.
              </p>
              <p>
                <b>Your notebook is yours.</b>{" "}
                {browserOnly
                  ? "Changes save in this browser on this device. Clearing site data removes them, and private browsing may discard them when closed. This edition does not sync with your account. "
                  : "Changes save to your signed-in account. "}
                Backups download all your plays and sessions; importing
                adds copies. Use SVG export for a clean diagram.
              </p>
              <p>
                <b>Keyboard.</b> Tab through the controls. Enter selects a
                player; arrow keys move them. Position fields work without
                dragging. Press ? to return here.
              </p>
            </div>
          </DialogContent>
        </Dialog>
        <AlertDialog
          open={!!deleting}
          onOpenChange={(v) => {
            if (!v) setDeleting(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove “{deleting?.title}”?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleting?.type === "play"
                  ? "Its session blocks will keep their notes and timing, with the diagram link removed."
                  : "This removes the session plan. Your plays stay in the playbook."}{" "}
                You can undo immediately afterwards.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction onClick={remove}>Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Dialog
          open={!!print}
          onOpenChange={(open) => {
            if (!open) setPrint(null);
          }}
        >
          <DialogContent className="print-dialog">
            <DialogTitle>Ready for the touchline.</DialogTitle>
            <DialogDescription>
              Review the card below, then print or save it as a PDF.
            </DialogDescription>
            <div className="print-toolbar">
              <Button onClick={() => window.print()}>Print / Save PDF</Button>
            </div>
            <div className="print-preview">
              <PrintDocument selection={print} data={data} />
            </div>
          </DialogContent>
        </Dialog>
        <Toaster position="bottom-center" theme="light" />
      </div>
      {print && (
        <div className="print-surface">
          <PrintDocument selection={print} data={data} />
        </div>
      )}
    </>
  );
}
function PrintPlay({ play }: { play: Play }) {
  return (
    <>
      <p className="print-category">{play.category}</p>
      <h1>{play.title}</h1>
      <p>{play.description}</p>
      <div className="print-play-pitch">
        <Pitch play={play} />
      </div>
      <h2>Coaching cues</h2>
      <p className="print-notes">
        {play.cues || "Make a note of what you notice."}
      </p>
      {play.setup && (
        <p className="print-notes">
          <b>Setup:</b> {play.setup}
        </p>
      )}
      {play.equipment && (
        <p>
          <b>Equipment:</b> {play.equipment}
        </p>
      )}
      {play.easier && (
        <p className="print-notes">
          <b>Make easier:</b> {play.easier}
        </p>
      )}
      {play.challenge && (
        <p className="print-notes">
          <b>Add challenge:</b> {play.challenge}
        </p>
      )}
      <p className="print-key">
        Solid line: run · Dotted line: pass · Attack travels toward the try
        line.
      </p>
    </>
  );
}

function PrintDocument({
  selection,
  data,
}: {
  selection: { play?: Play; session?: Session } | null;
  data: NotebookData;
}) {
  if (!selection) return null;
  return (
    <>
      <div className="print-brand">
        touchline <span>THE RUGBY NOTEBOOK</span>
      </div>
      {selection.play ? (
        <PrintPlay play={selection.play} />
      ) : (
        selection.session && (
          <>
            <h1>{selection.session.title}</h1>
            <p>
              {selection.session.date || "Date to be decided"} ·{" "}
              {selection.session.players} players ·{" "}
              {selection.session.blocks.reduce((n, b) => n + b.minutes, 0)}{" "}
              minutes
            </p>
            {selection.session.focus && (
              <p>
                <b>Focus:</b> {selection.session.focus}
              </p>
            )}
            {selection.session.success && (
              <p>
                <b>Look for:</b> {selection.session.success}
              </p>
            )}
            {selection.session.carriedForward && (
              <p className="print-notes">
                <b>From last time:</b> {selection.session.carriedForward}
              </p>
            )}
            {equipmentList(selection.session).length > 0 && (
              <p>
                <b>Bring:</b> {equipmentList(selection.session).join(" · ")}
              </p>
            )}
            {selection.session.blocks.map((b, i) => {
              const linked = data.plays.find((p) => p.id === b.playId);
              return (
                <section key={b.id} className="print-block">
                  <h2>
                    {String(i + 1).padStart(2, "0")} · {b.title}
                    <span>{b.minutes} min</span>
                  </h2>
                  <div className="print-block-body">
                    {linked && <Pitch play={linked} mini />}
                    <div>
                      {b.setup && (
                        <p className="print-notes">
                          <b>Setup:</b> {b.setup}
                        </p>
                      )}
                      <p className="print-notes">{b.notes}</p>
                      <p>
                        <b>Equipment:</b> {b.equipment || "—"}
                      </p>
                      {b.easier && (
                        <p className="print-notes">
                          <b>Make easier:</b> {b.easier}
                        </p>
                      )}
                      {b.challenge && (
                        <p className="print-notes">
                          <b>Add challenge:</b> {b.challenge}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
            {selection.session.review && (
              <section className="print-block">
                <h2>Reflection</h2>
                <p className="print-notes">
                  <b>What worked:</b> {selection.session.review.worked || "—"}
                </p>
                <p className="print-notes">
                  <b>Next time:</b> {selection.session.review.nextTime || "—"}
                </p>
              </section>
            )}
          </>
        )
      )}
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  Copy,
  CornerUpRight,
  Download,
  Flag,
  MousePointer2,
  Pause,
  Play as PlayIcon,
  Plus,
  Printer,
  Redo2,
  RotateCcw,
  Route,
  Send,
  Trash2,
  Undo2,
  Users,
  CalendarPlus,
  FlipHorizontal2,
  Maximize2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  clamp,
  uid,
  totalTime,
  mirrorPlay,
  setStartingCarrier,
  type Play,
  type Team,
  type Movement,
  ballActions,
} from "@/lib/touchline/model";
import {
  appendBallAction,
  assignKickReceiver,
  nearestReceiver,
} from "@/lib/touchline/ball";
import { downloadFile } from "@/lib/touchline/export";
import { Pitch } from "./pitch";
import { MovementEditor } from "./movement-editor";
import { Presentation } from "./presentation";
import { PlayRecorder, TraceControls } from "./play-recorder";

type Mode = "select" | "run" | "pass" | "kick" | "attack" | "defence" | "cone";
export function Editor({
  play,
  onChange,
  recordingError,
  onDuplicate,
  onPrint,
  onAddSession,
  disabled = false,
}: {
  play: Play;
  onChange: (p: Play) => void;
  recordingError?: (p: Play) => string | undefined;
  onDuplicate: () => void;
  onPrint: () => void;
  onAddSession: () => void;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("select"),
    [selected, setSelected] = useState(""),
    [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [history, setHistory] = useState<Play[]>([]),
    [future, setFuture] = useState<Play[]>([]),
    [hint, setHint] = useState(""),
    [editingMovement, setEditingMovement] = useState<string | null>(null),
    [presenting, setPresenting] = useState(false),
    [recordingPlay, setRecordingPlay] = useState(false);
  const current = useRef(play);
  current.current = play;
  const dragSnapshot = useRef<Play | null>(null);
  const pitchRef = useRef<HTMLDivElement>(null);
  const duration = totalTime(play);
  useEffect(() => {
    if (mode === "pass" || mode === "kick")
      setSelected(
        play.movements
          .filter((m) => m.kind !== "run")
          .sort((a, b) => a.start - b.start)
          .at(-1)?.targetId ?? play.ballId,
      );
  }, [mode, play.movements, play.ballId]);
  useEffect(() => {
    setTime(0);
    setPlaying(false);
    setSelected("");
    setHistory([]);
    setFuture([]);
    setMode("select");
    setEditingMovement(null);
    setPresenting(false);
    setRecordingPlay(false);
  }, [play.id]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0,
      last = performance.now();
    const tick = (now: number) => {
      const delta = ((now - last) / 1000) * speed;
      last = now;
      setTime((t) => Math.min(duration, t + delta));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, duration]);
  useEffect(() => {
    if (time >= duration) setPlaying(false);
  }, [time, duration]);
  useEffect(() => {
    const end = () => {
      if (dragSnapshot.current) {
        const snapshot = dragSnapshot.current;
        setHistory((h) => [...h.slice(-39), snapshot]);
        dragSnapshot.current = null;
        setFuture([]);
      }
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);
  const edit = (next: Play) => {
    if (disabled) return;
    const snapshot = current.current;
    setHistory((h) => [...h.slice(-39), snapshot]);
    setFuture([]);
    onChange({ ...next, updatedAt: new Date().toISOString() });
    setTime(0);
    setPlaying(false);
  };
  const update = (patch: Partial<Play>) =>
    edit({ ...current.current, ...patch });
  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    const snapshot = current.current;
    setFuture((f) => [snapshot, ...f]);
    setHistory((h) => h.slice(0, -1));
    onChange(previous);
    setTime(0);
    setPlaying(false);
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    const snapshot = current.current;
    setHistory((h) => [...h, snapshot]);
    setFuture((f) => f.slice(1));
    onChange(next);
    setTime(0);
    setPlaying(false);
  };
  const chooseMode = (m: Mode) => {
    setMode(m);
    setPlaying(false);
    setHint("");
    if (m === "pass" || m === "kick") {
      const passes = play.movements
        .filter((x) => x.kind !== "run")
        .sort((a, b) => a.start - b.start);
      setSelected(passes.at(-1)?.targetId ?? play.ballId);
      if (passes.length && !passes.at(-1)?.targetId)
        setHint(
          "The ball lands in space. Tap a player to receive the last kick.",
        );
      setTime(
        Math.max(
          time,
          passes.at(-1) ? passes.at(-1)!.start + passes.at(-1)!.duration : 0,
        ),
      );
    }
  };
  const addMovement = (movement: Movement) => {
    if (play.movements.length >= 120) {
      setHint(
        "This play has reached 120 movements. Remove a movement to add another.",
      );
      return;
    }
    if (movement.start > 180) {
      setHint("This play has reached the three-minute sequence limit.");
      return;
    }
    update({
      movements: [...play.movements, movement],
      ...(movement.kind !== "run" ? { ballTrace: undefined } : {}),
    });
  };
  const addBall = (target: { x: number; y: number; id?: string }) => {
    try {
      const last = ballActions(play).at(-1);
      const next =
        last && !last.targetId && target.id
          ? assignKickReceiver(play, target.id)
          : appendBallAction(
              play,
              mode === "kick" ? "kick" : "pass",
              target,
              time,
            );
      const action = ballActions(next).at(-1)!;
      edit(next);
      setTime(action.start);
      setPlaying(true);
      setMode("select");
      setSelected(action.targetId ?? action.playerId);
      setHint(
        action.targetId
          ? "Ball action added. The receiver catches it and keeps possession."
          : "Kick added. Choose Pass or Kick, then tap a player to make them the receiver.",
      );
    } catch (e) {
      setHint(e instanceof Error ? e.message : "Choose a ball target.");
    }
  };
  const onPlayer = (id: string) => {
    if (disabled) return;
    const player = play.players.find((p) => p.id === id);
    if (!player) return;
    if ((mode === "pass" || mode === "kick") && player.team !== "cone")
      addBall({ ...player, id });
    else setSelected(id);
  };
  const onCanvas = (x: number, y: number) => {
    if (disabled) return;
    x = clamp(x);
    y = clamp(y);
    if (["attack", "defence", "cone"].includes(mode)) {
      if (play.players.length >= 40) {
        setHint("Up to 40 players and cones fit in one play.");
        return;
      }
      const id = uid(),
        team = mode as Team;
      const labels = new Set(
        play.players.filter((p) => p.team === team).map((p) => p.label),
      );
      let number = 1;
      while (labels.has(String(number))) number++;
      update({
        players: [
          ...play.players,
          { id, label: team === "cone" ? "C" : String(number), team, x, y },
        ],
        ballId: play.ballId || (team !== "cone" ? id : ""),
      });
      setSelected(id);
    } else if (mode === "kick") {
      const target = nearestReceiver(play, { x, y }, time);
      addBall({ x, y, id: target?.id });
    } else if (mode === "run" && selected) {
      const player = play.players.find((p) => p.id === selected);
      if (!player || player.team === "cone") {
        setHint("Select a player first.");
        return;
      }
      const moves = play.movements.filter(
        (m) => m.playerId === selected && m.kind === "run",
      );
      const start = Math.max(
        time,
        0,
        ...moves.map((m) => m.start + m.duration),
      );
      addMovement({
        id: uid(),
        kind: "run",
        playerId: selected,
        x,
        y,
        start,
        duration: 2,
      });
      setHint("Run added. Tap again to extend the route.");
    } else if (mode === "select") setSelected("");
  };
  const drag = (id: string, x: number, y: number) => {
    if (disabled || playing || mode !== "select") return;
    if (!dragSnapshot.current) dragSnapshot.current = current.current;
    setTime(0);
    setSelected(id);
    onChange({
      ...current.current,
      players: current.current.players.map((p) =>
        p.id === id ? { ...p, x: clamp(x), y: clamp(y) } : p,
      ),
      updatedAt: new Date().toISOString(),
    });
  };
  const removePlayer = () => {
    if (!selected) return;
    const players = play.players.filter((p) => p.id !== selected);
    const firstAffected = play.movements
      .filter(
        (m) =>
          m.kind !== "run" &&
          (m.playerId === selected || m.targetId === selected),
      )
      .sort((a, b) => a.start - b.start)[0];
    const cutoff =
      play.ballId === selected ? 0 : (firstAffected?.start ?? Infinity);
    update({
      players,
      movements: play.movements.filter((m) =>
        m.kind === "run" ? m.playerId !== selected : m.start < cutoff,
      ),
      ballId:
        play.ballId === selected
          ? (players.find((p) => p.team !== "cone")?.id ?? "")
          : play.ballId,
      ballTrace: play.ballId === selected ? undefined : play.ballTrace,
    });
    setSelected("");
    setHint(
      cutoff < Infinity
        ? "Player removed. Ball actions from that point onward were cleared."
        : "Removed. The rest of the play is unchanged.",
    );
  };
  const exportSvg = () => {
    const svg = pitchRef.current?.querySelector("svg");
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "700");
    clone.setAttribute("height", "620");
    downloadFile(
      new XMLSerializer().serializeToString(clone),
      play.title + ".svg",
      "image/svg+xml",
    );
  };
  const player = play.players.find((p) => p.id === selected);
  const movement = play.movements.find((m) => m.id === editingMovement);
  const instructions: Record<Mode, string> = {
    select:
      "Drag players to set their starting positions. Arrow keys move a focused player.",
    run: selected
      ? `Tap the pitch to extend ${player?.label ?? "this player"}’s run. New legs start at the playhead or after their last run.`
      : "Select a player, then tap the pitch to draw their run.",
    pass: selected
      ? `Tap a receiver for ${player?.label ?? "the carrier"}. The pass starts at the playhead or after the last pass.`
      : "Add a player and give them the ball first.",
    kick: "Tap a receiver or open space. The ball follows an arc, then stays with the receiver or lands on the pitch.",
    attack: "Tap the pitch to add an attacker.",
    defence: "Tap the pitch to add a defender.",
    cone: "Tap the pitch to place a cone.",
  };
  return (
    <div className="editor-grid">
      <section className="board-panel">
        <div className="board-title">
          <div>
            <span className="category">
              {play.category.toUpperCase()} / DRAWING BOARD
            </span>
            <h2>{play.title}</h2>
          </div>
          <div className="icon-actions">
            <Button
              variant="ghost"
              size="icon"
              onClick={onDuplicate}
              disabled={disabled}
              aria-label="Duplicate play"
            >
              <Copy />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={exportSvg}
              aria-label="Download SVG diagram"
            >
              <Download />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrint}
              aria-label="Print play card"
            >
              <Printer />
            </Button>
          </div>
        </div>
        <div className="board-quick-actions">
          <Button
            variant="outline"
            disabled={disabled || !play.players.some((p) => p.team !== "cone")}
            onClick={() => {
              setPlaying(false);
              setRecordingPlay(true);
            }}
          >
            <PlayIcon />
            Play mode
          </Button>
          <Button variant="ghost" onClick={() => setPresenting(true)}>
            <Maximize2 />
            Show play
          </Button>
          <Button variant="ghost" disabled={disabled} onClick={onAddSession}>
            <CalendarPlus />
            Add to session
          </Button>
          <Button
            variant="ghost"
            disabled={disabled}
            onClick={() => {
              edit(mirrorPlay(play));
              setHint("Play mirrored. Undo returns to the original side.");
            }}
          >
            <FlipHorizontal2 />
            Mirror
          </Button>
        </div>
        <div
          className="drawing-tools"
          role="toolbar"
          aria-label="Drawing tools"
        >
          {(
            [
              { id: "select", icon: MousePointer2, label: "Move" },
              { id: "run", icon: Route, label: "Run" },
              { id: "pass", icon: Send, label: "Pass" },
              { id: "kick", icon: CornerUpRight, label: "Kick" },
              { id: "attack", icon: Plus, label: "Attacker" },
              { id: "defence", icon: Users, label: "Defender" },
              { id: "cone", icon: Flag, label: "Cone" },
            ] as const
          ).map((t) => (
            <Button
              key={t.id}
              variant={mode === t.id ? "secondary" : "ghost"}
              className={mode === t.id ? "tool active" : "tool"}
              aria-pressed={mode === t.id}
              disabled={disabled}
              onClick={() => chooseMode(t.id)}
            >
              <t.icon />
              {t.label}
            </Button>
          ))}
          <div className="undo-group">
            <Button
              variant="ghost"
              size="icon"
              disabled={!history.length || disabled}
              onClick={undo}
              aria-label="Undo edit"
            >
              <Undo2 />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!future.length || disabled}
              onClick={redo}
              aria-label="Redo edit"
            >
              <Redo2 />
            </Button>
          </div>
        </div>
        <div ref={pitchRef} className="pitch-wrap" data-export="pitch">
          <Pitch
            play={play}
            time={time}
            selected={selected}
            onPlayer={onPlayer}
            onCanvas={onCanvas}
            onMovement={
              !disabled && mode === "select"
                ? (id) => {
                    setPlaying(false);
                    setEditingMovement(id);
                  }
                : undefined
            }
            onNudge={
              !disabled && mode === "select" && !playing
                ? (id, x, y) =>
                    update({
                      players: play.players.map((p) =>
                        p.id === id ? { ...p, x: clamp(x), y: clamp(y) } : p,
                      ),
                    })
                : undefined
            }
            onDrag={mode === "select" && !disabled ? drag : undefined}
          />
        </div>
        <p className="tool-hint" aria-live="polite">
          {hint || instructions[mode]}
        </p>
        <div className="playback">
          <Button
            size="icon"
            className="play-button"
            aria-label={playing ? "Pause animation" : "Play animation"}
            onClick={() => {
              if (time >= duration) setTime(0);
              setPlaying(!playing);
            }}
          >
            {playing ? <Pause /> : <PlayIcon />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Restart animation"
            onClick={() => {
              setTime(0);
              setPlaying(false);
            }}
          >
            <RotateCcw />
          </Button>
          <Slider
            aria-label="Animation timeline"
            value={[time]}
            min={0}
            max={duration}
            step={0.05}
            onValueChange={([v]) => {
              setPlaying(false);
              setTime(v);
            }}
          />
          <span className="time-display">
            {time.toFixed(1)} <span>/ {duration.toFixed(1)}s</span>
          </span>
          <Button
            variant="ghost"
            className="speed-button"
            aria-label="Change playback speed"
            onClick={() => setSpeed(speed === 0.5 ? 1 : speed === 1 ? 2 : 0.5)}
          >
            {speed}×
          </Button>
        </div>
        <div className="pitch-legend">
          <span>
            <i className="attacker-key" />
            Attack
          </span>
          <span>
            <i className="defender-key" />
            Defence
          </span>
          <span>⟶ Run</span>
          <span className="pass-key">⇢ Pass · ⤴ Kick</span>
        </div>
      </section>
      <aside className="right-panel editor-inspector">
        <fieldset disabled={disabled}>
          <p className="eyebrow">THE IDEA</p>
          <label className="field-label" htmlFor="play-title">
            Play name
          </label>
          <Input
            id="play-title"
            value={play.title}
            maxLength={100}
            onChange={(e) => update({ title: e.target.value })}
          />
          <label className="field-label" htmlFor="category">
            Category
          </label>
          <Select
            value={play.category}
            onValueChange={(category) => update({ category })}
          >
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Attack", "Defence", "Set piece", "Skills"].map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="field-label" htmlFor="description">
            What are we looking for?
          </label>
          <Textarea
            id="description"
            value={play.description}
            maxLength={1000}
            rows={3}
            onChange={(e) => update({ description: e.target.value })}
          />
          <label className="field-label" htmlFor="cues">
            Coaching cues
          </label>
          <Textarea
            id="cues"
            value={play.cues}
            maxLength={3000}
            rows={4}
            placeholder="One thought per line"
            onChange={(e) => update({ cues: e.target.value })}
          />
          <details className="practice-details">
            <summary>Setup & adaptations</summary>
            <label className="field-label">
              Setup
              <Textarea
                value={play.setup ?? ""}
                maxLength={1000}
                rows={3}
                onChange={(e) => update({ setup: e.target.value })}
                placeholder="Space, groups and starting positions"
              />
            </label>
            <label className="field-label">
              Equipment
              <Input
                value={play.equipment ?? ""}
                maxLength={500}
                onChange={(e) => update({ equipment: e.target.value })}
                placeholder="Balls · cones · bibs"
              />
            </label>
            <label className="field-label">
              Make easier
              <Textarea
                value={play.easier ?? ""}
                maxLength={1000}
                rows={2}
                onChange={(e) => update({ easier: e.target.value })}
              />
            </label>
            <label className="field-label">
              Add challenge
              <Textarea
                value={play.challenge ?? ""}
                maxLength={1000}
                rows={2}
                onChange={(e) => update({ challenge: e.target.value })}
              />
            </label>
          </details>
          {player && (
            <div className="selection-card">
              <p className="eyebrow">SELECTED {player.team.toUpperCase()}</p>
              <label className="field-label" htmlFor="player-label">
                Label
              </label>
              <Input
                id="player-label"
                maxLength={4}
                value={player.label}
                onChange={(e) =>
                  update({
                    players: play.players.map((p) =>
                      p.id === selected ? { ...p, label: e.target.value } : p,
                    ),
                  })
                }
              />
              <div className="coordinate-fields">
                <label>
                  X
                  <Input
                    type="number"
                    aria-label="Player X position"
                    min={4}
                    max={96}
                    value={Math.round(player.x)}
                    onChange={(e) =>
                      update({
                        players: play.players.map((p) =>
                          p.id === selected
                            ? { ...p, x: clamp(Number(e.target.value)) }
                            : p,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Y
                  <Input
                    type="number"
                    aria-label="Player Y position"
                    min={4}
                    max={96}
                    value={Math.round(player.y)}
                    onChange={(e) =>
                      update({
                        players: play.players.map((p) =>
                          p.id === selected
                            ? { ...p, y: clamp(Number(e.target.value)) }
                            : p,
                        ),
                      })
                    }
                  />
                </label>
              </div>
              {player.team !== "cone" && (
                <Button
                  variant="outline"
                  className="wide-button"
                  disabled={play.ballId === selected}
                  onClick={() => {
                    edit(setStartingCarrier(play, selected));
                    setHint(
                      "Starting carrier changed. Add passes or kicks when needed.",
                    );
                  }}
                >
                  {play.ballId === selected
                    ? "Starts with the ball"
                    : play.movements.some((m) => m.kind !== "run")
                      ? "Give ball & clear ball actions"
                      : "Give starting ball"}
                </Button>
              )}
              <Button
                variant="ghost"
                className="danger-text wide-button"
                onClick={removePlayer}
              >
                <Trash2 />
                Remove {player.team === "cone" ? "cone" : "player"}
              </Button>
            </div>
          )}
          <div className="divider" />
          {play.ballTrace && (
            <details className="practice-details recorded-ball-details">
              <summary>Recorded ball route</summary>
              <TraceControls
                value={play.ballTrace}
                onChange={(settings) =>
                  update({ ballTrace: { ...play.ballTrace!, ...settings } })
                }
              />
              <Button
                variant="ghost"
                onClick={() => update({ ballTrace: undefined })}
              >
                Use carrier possession
              </Button>
              <p className="form-note">
                Adding a pass or kick, or changing the starting carrier replaces
                this route.
              </p>
            </details>
          )}
          <div className="panel-heading">
            <span>MOVEMENT SEQUENCE</span>
            <span>{play.movements.length}</span>
          </div>
          <div className="movement-list">
            {play.movements.length === 0 ? (
              <p className="empty-small">
                Add a run, pass or kick to bring the idea to life.
              </p>
            ) : (
              [...play.movements]
                .sort((a, b) => a.start - b.start)
                .map((m, i) => (
                  <div className="movement-row" key={m.id}>
                    <span className={m.kind !== "run" ? "movement-pass" : ""}>
                      {m.kind === "kick" ? (
                        <CornerUpRight size={14} />
                      ) : m.kind === "pass" ? (
                        <Send size={14} />
                      ) : (
                        <Route size={14} />
                      )}
                    </span>
                    <div>
                      <strong>
                        {play.players.find((p) => p.id === m.playerId)?.label}{" "}
                        {m.kind !== "run"
                          ? (m.kind === "kick" ? "kicks → " : "passes → ") +
                            (play.players.find((p) => p.id === m.targetId)
                              ?.label ?? "space")
                          : m.trace
                            ? "recorded run"
                            : "runs"}
                      </strong>
                      <small>
                        {m.start.toFixed(1)}–{(m.start + m.duration).toFixed(1)}
                        s
                      </small>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit movement ${i + 1}`}
                      onClick={() => {
                        setPlaying(false);
                        setEditingMovement(m.id);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={"Remove movement " + (i + 1)}
                      onClick={() =>
                        update({
                          movements:
                            m.kind !== "run"
                              ? play.movements.filter(
                                  (x) => x.kind === "run" || x.start < m.start,
                                )
                              : play.movements.filter((x) => x.id !== m.id),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))
            )}
          </div>
          <p className="inspector-note">
            A tactical sketch, not a prediction. Players follow the lines you
            draw.
          </p>
        </fieldset>
      </aside>
      {movement && (
        <MovementEditor
          key={movement.id}
          play={play}
          movement={movement}
          onApply={(next) =>
            update({
              movements: play.movements.map((m) =>
                m.id === next.id ? next : m,
              ),
            })
          }
          onClose={() => setEditingMovement(null)}
        />
      )}
      {presenting && (
        <Presentation play={play} onClose={() => setPresenting(false)} />
      )}
      {recordingPlay && (
        <PlayRecorder
          play={play}
          onApply={(next) => {
            const error = recordingError?.(next);
            if (error) return error;
            edit(next);
            setHint(
              "Recording converted into a slate. Play it through, or use a movement pencil to adjust its lines. Undo restores your previous sequence.",
            );
          }}
          onClose={() => setRecordingPlay(false)}
        />
      )}
    </div>
  );
}

"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Check,
  Circle,
  Play as PlayIcon,
  Square,
  Undo2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Pitch } from "./pitch";
import { PlaybackBoard } from "./presentation";
import { type Play, clamp, uid } from "@/lib/touchline/model";
import {
  type Trace,
  type TracePoint,
  finishTrace,
} from "@/lib/touchline/trace";
import { playSchema } from "@/lib/touchline/validation";

import { recordedSlate, capturePreview } from "@/lib/touchline/recording";

type Settings = Omit<Trace, "points">;
export function TraceControls({
  value,
  onChange,
}: {
  value: Settings;
  onChange: (value: Settings) => void;
}) {
  return (
    <fieldset className="trace-controls">
      <legend>Shape the lines</legend>
      <div className="trace-modes">
        <Button
          type="button"
          variant={value.mode === "natural" ? "secondary" : "outline"}
          aria-pressed={value.mode === "natural"}
          onClick={() => onChange({ ...value, mode: "natural" })}
        >
          Natural movement
        </Button>
        <Button
          type="button"
          variant={value.mode === "polygon" ? "secondary" : "outline"}
          aria-pressed={value.mode === "polygon"}
          onClick={() => onChange({ ...value, mode: "polygon" })}
        >
          Polygon lines
        </Button>
      </div>
      {value.mode === "polygon" && (
        <>
          <label>
            Number of edges <output>{value.edges}</output>
            <input
              aria-label="Number of edges"
              type="range"
              min="1"
              max="24"
              step="1"
              value={value.edges}
              onChange={(e) =>
                onChange({ ...value, edges: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Straighten <output>{value.straighten}%</output>
            <input
              aria-label="Straighten recorded lines"
              type="range"
              min="0"
              max="100"
              step="5"
              value={value.straighten}
              onChange={(e) =>
                onChange({ ...value, straighten: Number(e.target.value) })
              }
            />
          </label>
          <p className="form-note">
            At 100%, each route follows up to {value.edges} straight{" "}
            {value.edges === 1 ? "edge" : "edges"}. Lower values keep more of
            your hand-drawn shape. Pauses and pace stay in the timeline.
          </p>
        </>
      )}
    </fieldset>
  );
}

import { BallDirector } from "./ball-director";
export function PlayRecorder({
  play,
  onApply,
  onClose,
}: {
  play: Play;
  onApply: (play: Play) => string | void;
  onClose: () => void;
}) {
  const players = useMemo(
    () => play.players.filter((p) => p.team !== "cone"),
    [play.players],
  );
  const initialTakes = useMemo(
    () =>
      Object.fromEntries(
        play.movements
          .filter((m) => m.trace)
          .map((m) => [m.playerId, m.trace!.points]),
      ),
    [play.movements],
  );
  const [takes, setTakes] =
    useState<Record<string, TracePoint[]>>(initialTakes);
  const [replaced, setReplaced] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<
    { takes: Record<string, TracePoint[]>; replaced: Set<string> }[]
  >([]);
  const [selected, setSelected] = useState(
    players.find((p) => !Object.hasOwn(initialTakes, p.id))?.id ??
      players[0]?.id ??
      "",
  );
  const [duration, setDuration] = useState(play.clipDuration ?? 8);
  const [stage, setStage] = useState<"record" | "ball" | "slate">("record");
  const [ballPlan, setBallPlan] = useState({
    ballId: play.ballId,
    ballTrace: play.ballTrace,
    actions: play.movements.filter((m) => m.kind !== "run"),
  });
  const [settings, setSettings] = useState<Settings>(() => {
    const t = play.movements.find((m) => m.trace)?.trace;
    return t
      ? { mode: t.mode, edges: t.edges, straighten: t.straighten }
      : { mode: "natural", edges: 6, straighten: 100 };
  });
  const [reshape, setReshape] = useState(false);
  const [recording, setRecording] = useState(false);
  const [time, setTime] = useState(0);
  const [live, setLive] = useState<{ x: number; y: number } | null>(null);
  const [message, setMessage] = useState(
    "Drag a player to record their movement. Release to finish. Everyone else keeps their current path.",
  );
  const cancelBallDrag = useRef<(() => boolean) | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const active = useRef<{
    id: string;
    started: number | null;
    points: TracePoint[];
    position: { x: number; y: number };
    pointer?: number;
    originX?: number;
    originY?: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const finishRef = useRef<(cancel?: boolean) => void>(() => {});
  const suppressClickUntil = useRef(0);
  const recorded = useMemo(
    () =>
      recordedSlate(
        {
          ...play,
          ballId: ballPlan.ballId,
          ballTrace: ballPlan.ballTrace,
          movements: [
            ...play.movements.filter((m) => m.kind === "run"),
            ...ballPlan.actions,
          ],
        },
        takes,
        replaced,
        duration,
        settings,
        reshape,
        ballPlan.ballTrace?.points,
      ),
    [play, ballPlan, takes, replaced, duration, settings, reshape],
  );
  const performing =
    recording && live && active.current?.started !== null && active.current
      ? capturePreview(
          recorded,
          active.current.id,
          active.current.points,
          live,
          time,
          duration,
        )
      : recorded;
  const selectedPlayer = players.find((p) => p.id === selected);
  const saveTake = (id: string, points: TracePoint[]) => {
    setHistory((h) => [...h.slice(-19), { takes, replaced }]);
    const next = { ...takes, [id]: points };
    setTakes(next);
    setReplaced((p) => new Set([...p, id]));
    const nextPlayer = players.find((p) => !Object.hasOwn(next, p.id));
    if (nextPlayer) setSelected(nextPlayer.id);
    setMessage(
      nextPlayer
        ? `Take saved. Player ${nextPlayer.label} is ready, or continue to the ball.`
        : "Players ready. Continue to the ball, or preview your play.",
    );
  };
  const finish = (cancel = false) => {
    const take = active.current;
    if (!take) return;
    active.current = null;
    suppressClickUntil.current = performance.now() + 300;
    setRecording(false);
    setTime(0);
    setLive(null);
    if (
      take.pointer !== undefined &&
      surface.current?.hasPointerCapture(take.pointer)
    )
      surface.current.releasePointerCapture(take.pointer);
    if (cancel) {
      setMessage("Take cancelled. Your earlier paths are kept.");
      return;
    }
    if (take.started === null) return;
    const elapsed = Math.min(
      duration,
      (performance.now() - take.started) / 1000,
    );
    const last = take.points.at(-1)!;
    if (elapsed > last.t) take.points.push({ ...take.position, t: elapsed });
    else Object.assign(last, take.position);
    saveTake(take.id, finishTrace(take.points, elapsed, duration));
  };
  finishRef.current = finish;
  useEffect(() => {
    if (!recording) return;
    let frame = 0;
    const tick = () => {
      const take = active.current;
      if (!take) return;
      if (take.started !== null) {
        const elapsed = Math.min(
          duration,
          (performance.now() - take.started) / 1000,
        );
        if (elapsed - take.points.at(-1)!.t >= 0.05 && elapsed < duration)
          take.points.push({ ...take.position, t: elapsed });
        setTime(elapsed);
        setLive({ ...take.position });
        if (elapsed >= duration) {
          finishRef.current();
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    const cancel = () => finishRef.current(true);
    const hidden = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", hidden);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [recording, duration]);
  useEffect(
    () => () => {
      active.current = null;
    },
    [],
  );
  const begin = (id: string, immediate: boolean) => {
    const player = players.find((p) => p.id === id);
    if (!player) return;
    setSelected(id);
    setTime(0);
    setLive({ x: player.x, y: player.y });
    setRecording(true);
    active.current = {
      id,
      started: immediate ? performance.now() : null,
      points: [{ x: player.x, y: player.y, t: 0 }],
      position: { x: player.x, y: player.y },
      offsetX: 0,
      offsetY: 0,
    };
    setMessage(
      immediate
        ? `Recording player ${player.label}. Drag or use arrow keys; release or Finish take to stop.`
        : `Drag player ${player.label} to start the clock.`,
    );
  };
  const coordinates = (e: ReactPointerEvent) => {
    const svg = surface.current?.querySelector("svg");
    if (!svg?.getScreenCTM()) return null;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const p = point.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x / 7, y: p.y / 6.2 };
  };
  const move = (e: ReactPointerEvent) => {
    const take = active.current;
    if (!take || take.pointer !== e.pointerId) return;
    const point = coordinates(e);
    if (!point) return;
    if (take.started === null) {
      if (
        Math.hypot(
          e.clientX - (take.originX ?? e.clientX),
          e.clientY - (take.originY ?? e.clientY),
        ) < 4
      )
        return;
      take.started = performance.now();
      setMessage("Recording. Release to finish this take.");
    }
    take.position = {
      x: clamp(point.x + take.offsetX),
      y: clamp(point.y + take.offsetY),
    };
  };
  const hold = () => {
    if (selectedPlayer)
      saveTake(selected, [
        { x: selectedPlayer.x, y: selectedPlayer.y, t: 0 },
        { x: selectedPlayer.x, y: selectedPlayer.y, t: 1 },
      ]);
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          finish(true);
          onClose();
        }
      }}
    >
      <DialogContent
        className="recorder-dialog"
        onEscapeKeyDown={(e) => {
          if (active.current) {
            e.preventDefault();
            finish(true);
          } else if (cancelBallDrag.current?.()) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle>Play mode</DialogTitle>
        <DialogDescription>
          Move the players. Direct the ball. Watch the whole idea come together.
        </DialogDescription>
        <div className="recorder-stages" aria-label="Play mode stages">
          <Button
            variant={stage === "record" ? "secondary" : "ghost"}
            disabled={recording}
            onClick={() => setStage("record")}
          >
            1 · Players
          </Button>
          <ArrowRight size={15} />
          <Button
            variant={stage === "ball" ? "secondary" : "ghost"}
            disabled={recording}
            onClick={() => setStage("ball")}
          >
            2 · Ball
          </Button>
          <ArrowRight size={15} />
          <Button
            variant={stage === "slate" ? "secondary" : "ghost"}
            disabled={recording}
            onClick={() => setStage("slate")}
          >
            3 · Preview
          </Button>
        </div>
        {stage === "ball" ? (
          <BallDirector
            escapeRef={cancelBallDrag}
            play={recorded}
            onChange={(next) =>
              setBallPlan({
                ballId: next.ballId,
                ballTrace: next.ballTrace,
                actions: next.movements.filter((m) => m.kind !== "run"),
              })
            }
          />
        ) : stage === "slate" ? (
          <div className="recorder-grid">
            <PlaybackBoard
              key={`${settings.mode}-${settings.edges}-${settings.straighten}`}
              play={recorded}
            />
            <aside className="recorder-sidebar">
              <TraceControls
                value={settings}
                onChange={(next) => {
                  setSettings(next);
                  setReshape(true);
                }}
              />
              <p className="form-note">
                Shape your recorded runs. Original takes and timing are kept.
                Ball actions follow their receivers.
              </p>
            </aside>
          </div>
        ) : (
          <div className="recorder-grid">
            <div>
              <div className="recording-heading">
                <strong>
                  {recording
                    ? "● Recording"
                    : `Player ${selectedPlayer?.label ?? ""}`}
                </strong>
                <span>
                  {replaced.size} new {replaced.size === 1 ? "take" : "takes"}
                </span>
              </div>
              <div className="recorder-transport">
                <Button
                  onClick={() => {
                    if (recording) finish();
                    else {
                      begin(selected, true);
                      requestAnimationFrame(() =>
                        Array.from(
                          surface.current?.querySelectorAll<SVGElement>(
                            "[data-player]",
                          ) ?? [],
                        )
                          .find(
                            (el) => el.getAttribute("data-player") === selected,
                          )
                          ?.focus({ preventScroll: true }),
                      );
                    }
                  }}
                >
                  {recording ? <Square /> : <PlayIcon />}
                  {recording ? "Finish take" : "Start clock"}
                </Button>
                <span className="time-display">
                  {time.toFixed(1)} / {duration.toFixed(1)}s
                </span>
                {recording ? (
                  <Button variant="ghost" onClick={() => finish(true)}>
                    Cancel take
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    disabled={!history.length}
                    onClick={() => {
                      const previous = history.at(-1)!;
                      setTakes(previous.takes);
                      setReplaced(previous.replaced);
                      setHistory((h) => h.slice(0, -1));
                      setMessage("Last take undone.");
                    }}
                  >
                    <Undo2 />
                    Undo take
                  </Button>
                )}
              </div>
              <div
                ref={surface}
                className={`recorder-surface ${recording ? "is-recording" : ""}`}
                onClickCapture={(e) => {
                  if (performance.now() < suppressClickUntil.current) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  const target = (e.target as Element).closest("[data-player]");
                  const id = target?.getAttribute("data-player");
                  if (
                    !id ||
                    !players.some((p) => p.id === id) ||
                    active.current?.pointer !== undefined
                  )
                    return;
                  if (active.current && active.current.id !== id) return;
                  if (!active.current) begin(id, false);
                  const take = active.current,
                    point = coordinates(e);
                  if (!take || !point) return;
                  take.pointer = e.pointerId;
                  take.originX = e.clientX;
                  take.originY = e.clientY;
                  take.offsetX = take.position.x - point.x;
                  take.offsetY = take.position.y - point.y;
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={move}
                onPointerUp={(e) => {
                  if (active.current?.pointer === e.pointerId) {
                    move(e);
                    finish();
                  }
                }}
                onPointerCancel={() => finish(true)}
                onLostPointerCapture={() => {
                  if (active.current?.pointer !== undefined) finish(true);
                }}
              >
                <Pitch
                  play={performing}
                  time={time}
                  selected={selected}
                  hideRoutes
                  interactivePlayerId={recording ? selected : undefined}
                  positions={live ? { [selected]: live } : undefined}
                  onPlayer={(id) => {
                    if (!recording && players.some((p) => p.id === id))
                      setSelected(id);
                  }}
                  onNudge={(id, x, y) => {
                    const take = active.current;
                    const p = players.find((p) => p.id === id);
                    if (take?.id === id && p) {
                      if (take.started === null)
                        take.started = performance.now();
                      take.position = {
                        x: clamp(take.position.x + x - p.x),
                        y: clamp(take.position.y + y - p.y),
                      };
                    }
                  }}
                />
              </div>
              <p className="recorder-message" role="status">
                {message}
              </p>
            </div>
            <aside className="recorder-sidebar">
              <label className="field-label">
                Clip length (seconds)
                <Input
                  type="number"
                  aria-label="Recording clip length"
                  min="1"
                  max="30"
                  step=".5"
                  value={duration}
                  disabled={recording || Object.keys(takes).length > 0}
                  onChange={(e) =>
                    setDuration(
                      Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                    )
                  }
                />
              </label>
              <div className="take-list" aria-label="Players to record">
                {players.map((p) => (
                  <button
                    key={p.id}
                    className={
                      selected === p.id ? "take-row active" : "take-row"
                    }
                    disabled={recording}
                    aria-pressed={selected === p.id}
                    onClick={() => setSelected(p.id)}
                  >
                    {Object.hasOwn(takes, p.id) ? (
                      <Check size={17} />
                    ) : (
                      <Circle size={17} />
                    )}
                    <span>
                      {p.team === "attack" ? "Attacker" : "Defender"} {p.label}
                    </span>
                    <small>
                      {Object.hasOwn(takes, p.id)
                        ? "Recorded"
                        : play.movements.some(
                              (m) => m.kind === "run" && m.playerId === p.id,
                            )
                          ? "Existing path"
                          : "Still"}
                    </small>
                  </button>
                ))}
              </div>
              <Button variant="outline" disabled={recording} onClick={hold}>
                Keep selected player still
              </Button>
              <Button disabled={recording} onClick={() => setStage("ball")}>
                Continue to ball <ArrowRight />
              </Button>
              <p className="form-note">
                Record only the players you want to change. Dragging starts the
                clock; Start clock lets you wait before moving or use arrow
                keys.
              </p>
            </aside>
          </div>
        )}
        <div className="recorder-footer">
          <p className="form-note">
            Your changes stay in this draft until you use the slate. Undo on the
            drawing board restores the previous play.
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              finish(true);
              onClose();
            }}
          >
            Discard draft
          </Button>
          <Button
            disabled={recording}
            onClick={() => {
              const next = {
                ...recorded,
                movements: recorded.movements.map((m) => ({ ...m, id: uid() })),
              };
              const valid = playSchema.safeParse(next);
              if (!valid.success) {
                setMessage(
                  valid.error.issues[0]?.message ?? "Check this play.",
                );
                setStage("record");
                return;
              }
              const error = onApply(next);
              if (error) {
                setMessage(error);
                setStage("record");
                return;
              }
              onClose();
            }}
          >
            Use this slate <ArrowRight />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

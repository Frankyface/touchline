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
import { type Play, ballAt, clamp, uid } from "@/lib/touchline/model";
import {
  type Trace,
  type TracePoint,
  finishTrace,
} from "@/lib/touchline/trace";
import { playSchema } from "@/lib/touchline/validation";

import {
  BALL_TAKE,
  recordedSlate,
  type RecordingSelection,
} from "@/lib/touchline/recording";

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
  const [reshape, setReshape] = useState(false);
  const [ballTake, setBallTake] = useState<TracePoint[] | undefined>(
    play.ballTrace?.points,
  );
  const [ballDone, setBallDone] = useState(!!play.ballTrace);
  const [selected, setSelected] = useState<RecordingSelection>(
    players.find((p) => !Object.hasOwn(initialTakes, p.id))?.id ??
      players[0]?.id ??
      BALL_TAKE,
  );
  const [duration, setDuration] = useState(play.clipDuration ?? 8);
  const [settings, setSettings] = useState<Settings>(() => {
    const trace = play.movements.find((m) => m.trace)?.trace ?? play.ballTrace;
    return trace
      ? { mode: trace.mode, edges: trace.edges, straighten: trace.straighten }
      : { mode: "natural", edges: 6, straighten: 100 };
  });
  const [stage, setStage] = useState<"record" | "slate">("record");
  const [recording, setRecording] = useState(false);
  const [time, setTime] = useState(0);
  const [live, setLive] = useState<{ x: number; y: number } | null>(null);
  const [message, setMessage] = useState(
    "Choose a player, press Play & record, then drag them. Release to finish the take.",
  );
  const surface = useRef<HTMLDivElement>(null);
  const active = useRef<{
    id: RecordingSelection;
    started: number;
    points: TracePoint[];
    position: { x: number; y: number };
    pointer?: number;
  } | null>(null);
  const finishRef = useRef<(cancel?: boolean) => void>(() => {});
  const suppressSelectUntil = useRef(0);
  const allPlayersDone = players.every((p) => Object.hasOwn(takes, p.id));
  const complete = allPlayersDone && ballDone;
  const selectedPlayer = players.find((p) => p.id === selected);
  const label =
    selected === BALL_TAKE
      ? "the ball"
      : `${selectedPlayer?.team === "defence" ? "defender" : "attacker"} ${selectedPlayer?.label ?? ""}`;
  const recorded = useMemo(
    () =>
      recordedSlate(
        play,
        takes,
        replaced,
        duration,
        settings,
        reshape,
        ballTake,
      ),
    [play, takes, replaced, duration, settings, reshape, ballTake],
  );
  // Capture and replay use the same clock. New takes always start at time zero.
  const firstBall = ballAt({ ...recorded, ballTrace: undefined }, 0);
  const ballStart = {
    x: clamp(firstBall.x + 19 / 7),
    y: clamp(firstBall.y - 17 / 6.2),
  };

  const nextPlayer = (
    next: Record<string, TracePoint[]>,
    id: RecordingSelection,
  ) => {
    if (id === BALL_TAKE) {
      setBallDone(true);
      setStage("slate");
      return;
    }
    const nextId =
      players.find((p) => !Object.hasOwn(next, p.id))?.id ?? BALL_TAKE;
    setSelected(nextId);
    setMessage(
      nextId === BALL_TAKE
        ? "Players ready. Record the ball while every player replays their take."
        : "Take recorded. The next player is ready; earlier takes will play alongside you.",
    );
  };
  const finish = (cancel = false) => {
    const take = active.current;
    if (!take) return;
    active.current = null;
    suppressSelectUntil.current = performance.now() + 300;
    setRecording(false);
    setLive(null);
    setTime(0);
    if (
      take.pointer !== undefined &&
      surface.current?.hasPointerCapture(take.pointer)
    )
      surface.current.releasePointerCapture(take.pointer);
    if (cancel) {
      setMessage("Take cancelled. Your earlier recordings are still here.");
      return;
    }
    const elapsed = Math.min(
      duration,
      (performance.now() - take.started) / 1000,
    );
    const last = take.points[take.points.length - 1];
    if (elapsed > last.t) take.points.push({ ...take.position, t: elapsed });
    else Object.assign(last, take.position);
    const points = finishTrace(take.points, elapsed, duration);
    if (take.id === BALL_TAKE) setBallTake(points);
    else {
      const id = take.id;
      setTakes((previous) => ({ ...previous, [id]: points }));
      setReplaced((previous) => new Set([...previous, id]));
    }
    nextPlayer(
      take.id === BALL_TAKE ? takes : { ...takes, [take.id]: points },
      take.id,
    );
  };
  finishRef.current = finish;
  useEffect(() => {
    if (!recording) return;
    let frame = 0;
    const tick = () => {
      const take = active.current;
      if (!take) return;
      const elapsed = Math.min(
        duration,
        (performance.now() - take.started) / 1000,
      );
      if (
        elapsed - take.points[take.points.length - 1].t >= 0.05 &&
        elapsed < duration
      )
        take.points.push({ ...take.position, t: elapsed });
      setTime(elapsed);
      if (elapsed >= duration) finishRef.current();
      else frame = requestAnimationFrame(tick);
    };
    const interrupt = () => finishRef.current(true);
    const hidden = () => {
      if (document.hidden) interrupt();
    };
    window.addEventListener("blur", interrupt);
    document.addEventListener("visibilitychange", hidden);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("blur", interrupt);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [recording, duration]);
  useEffect(
    () => () => {
      active.current = null;
    },
    [],
  );
  const begin = () => {
    if (selected === BALL_TAKE && !allPlayersDone) return;
    const position =
      selected === BALL_TAKE ? (ballTake?.[0] ?? ballStart) : selectedPlayer;
    if (!position) return;
    const start = { x: position.x, y: position.y };
    active.current = {
      id: selected,
      started: performance.now(),
      points: [{ ...start, t: 0 }],
      position: start,
    };
    setTime(0);
    setLive(start);
    setRecording(true);
    setMessage(
      `Recording ${label}. Drag now; release to finish. Escape cancels this take.`,
    );
    requestAnimationFrame(() => {
      const target =
        selected === BALL_TAKE
          ? surface.current?.querySelector<SVGElement>("[data-ball]")
          : Array.from(
              surface.current?.querySelectorAll<SVGElement>("[data-player]") ??
                [],
            ).find((el) => el.getAttribute("data-player") === selected);
      target?.focus({ preventScroll: true });
    });
  };
  const coordinates = (e: ReactPointerEvent) => {
    const svg = surface.current?.querySelector("svg");
    if (!svg?.getScreenCTM()) return null;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const local = point.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: clamp(local.x / 7), y: clamp(local.y / 6.2) };
  };
  const movePointer = (e: ReactPointerEvent) => {
    const take = active.current;
    if (!take || take.pointer !== e.pointerId) return;
    const point = coordinates(e);
    if (point) {
      take.position = point;
      setLive(point);
    }
  };
  const hold = () => {
    if (!selectedPlayer || selected === BALL_TAKE) return;
    const point = { x: selectedPlayer.x, y: selectedPlayer.y };
    const next = {
      ...takes,
      [selected]: [
        { ...point, t: 0 },
        { ...point, t: 1 },
      ],
    };
    setTakes(next);
    setReplaced((previous) => new Set([...previous, selected]));
    nextPlayer(next, selected);
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
          }
        }}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle>Play mode</DialogTitle>
        <DialogDescription>
          Perform the movement, one player at a time. Record the ball last, then
          turn your takes into a slate.
        </DialogDescription>
        <div className="recorder-stages">
          <Button
            variant={stage === "record" ? "secondary" : "ghost"}
            disabled={recording}
            onClick={() => setStage("record")}
          >
            1 · Record the play
          </Button>
          <ArrowRight size={15} />
          <Button
            variant={stage === "slate" ? "secondary" : "ghost"}
            disabled={recording || !Object.keys(takes).length}
            onClick={() => setStage("slate")}
          >
            2 · Shape the slate
          </Button>
        </div>
        <div className="recorder-grid">
          <div>
            {stage === "record" ? (
              <>
                <div
                  className={`recorder-surface ${recording ? "is-recording" : ""}`}
                  ref={surface}
                  onKeyDown={(e) => {
                    const take = active.current;
                    if (
                      take?.id !== BALL_TAKE ||
                      ![
                        "ArrowLeft",
                        "ArrowRight",
                        "ArrowUp",
                        "ArrowDown",
                      ].includes(e.key)
                    )
                      return;
                    e.preventDefault();
                    take.position = {
                      x: clamp(
                        take.position.x +
                          (e.key === "ArrowRight"
                            ? 1
                            : e.key === "ArrowLeft"
                              ? -1
                              : 0),
                      ),
                      y: clamp(
                        take.position.y +
                          (e.key === "ArrowDown"
                            ? 1
                            : e.key === "ArrowUp"
                              ? -1
                              : 0),
                      ),
                    };
                    setLive(take.position);
                  }}
                  onPointerDown={(e) => {
                    const take = active.current;
                    if (!take || take.pointer !== undefined || e.button !== 0)
                      return;
                    const target = (e.target as Element).closest(
                      "[data-player], [data-ball]",
                    );
                    if (
                      !target ||
                      (take.id === BALL_TAKE
                        ? !target.hasAttribute("data-ball")
                        : target.getAttribute("data-player") !== take.id)
                    )
                      return;
                    e.preventDefault();
                    take.pointer = e.pointerId;
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={movePointer}
                  onPointerUp={(e) => {
                    if (active.current?.pointer === e.pointerId) {
                      movePointer(e);
                      finish();
                    }
                  }}
                  onPointerCancel={() => finish(true)}
                  onLostPointerCapture={() => {
                    if (active.current?.pointer !== undefined) finish(true);
                  }}
                >
                  <Pitch
                    play={recorded}
                    time={time}
                    selected={selected === BALL_TAKE ? undefined : selected}
                    hideRoutes
                    positions={
                      live && selected !== BALL_TAKE
                        ? { [selected]: live }
                        : undefined
                    }
                    ballPosition={
                      live && selected === BALL_TAKE ? live : undefined
                    }
                    onPlayer={(id) => {
                      if (
                        !recording &&
                        performance.now() >= suppressSelectUntil.current &&
                        players.some((p) => p.id === id)
                      ) {
                        setSelected(id);
                        setTime(0);
                      }
                    }}
                    onBall={
                      allPlayersDone
                        ? () => {
                            if (
                              !recording &&
                              performance.now() >= suppressSelectUntil.current
                            )
                              setSelected(BALL_TAKE);
                          }
                        : undefined
                    }
                    onNudge={(id, x, y) => {
                      const take = active.current;
                      if (take?.id === id) {
                        const point = {
                          x: clamp(
                            take.position.x + x - (selectedPlayer?.x ?? x),
                          ),
                          y: clamp(
                            take.position.y + y - (selectedPlayer?.y ?? y),
                          ),
                        };
                        take.position = point;
                        setLive(point);
                      }
                    }}
                  />
                </div>
                <div className="recorder-transport">
                  <Button
                    onClick={recording ? () => finish() : begin}
                    disabled={
                      !players.length ||
                      (selected === BALL_TAKE && !allPlayersDone)
                    }
                  >
                    {recording ? <Square /> : <PlayIcon />}
                    {recording ? "Finish take" : "Play & record"}
                  </Button>
                  <span className="time-display">
                    {time.toFixed(1)} / {duration.toFixed(1)}s
                  </span>
                  {recording && (
                    <Button variant="ghost" onClick={() => finish(true)}>
                      Cancel take
                    </Button>
                  )}
                </div>
                <p className="recorder-message" role="status">
                  {message}
                </p>
              </>
            ) : (
              <PlaybackBoard
                key={`preview-${settings.mode}-${settings.edges}-${settings.straighten}`}
                play={recorded}
              />
            )}
          </div>
          <aside className="recorder-sidebar">
            {stage === "record" ? (
              <>
                <label className="field-label">
                  Clip length (seconds)
                  <Input
                    type="number"
                    aria-label="Recording clip length"
                    min="1"
                    max="30"
                    step="0.5"
                    value={duration}
                    disabled={recording || Object.keys(takes).length > 0}
                    onChange={(e) =>
                      setDuration(
                        Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                      )
                    }
                  />
                </label>
                <p className="form-note">
                  Every take uses this timeline. Release early to hold the final
                  position. Choose the length before your first take. Arrow keys
                  can move the selected player or ball while recording.
                </p>
                <div className="take-list" aria-label="Players to record">
                  {players.map((p) => (
                    <button
                      key={p.id}
                      disabled={recording}
                      className={
                        selected === p.id ? "take-row active" : "take-row"
                      }
                      aria-pressed={selected === p.id}
                      onClick={() => {
                        setSelected(p.id);
                        setTime(0);
                      }}
                    >
                      {Object.hasOwn(takes, p.id) ? (
                        <Check size={17} />
                      ) : (
                        <Circle size={17} />
                      )}
                      <span>
                        {p.team === "attack" ? "Attacker" : "Defender"}{" "}
                        {p.label}
                      </span>
                      <small>
                        {Object.hasOwn(takes, p.id) ? "Recorded" : "Ready"}
                      </small>
                    </button>
                  ))}
                  <button
                    disabled={recording || !allPlayersDone}
                    className={
                      selected === BALL_TAKE
                        ? "take-row active ball-take"
                        : "take-row ball-take"
                    }
                    aria-pressed={selected === BALL_TAKE}
                    onClick={() => {
                      setSelected(BALL_TAKE);
                      setTime(0);
                    }}
                  >
                    {ballDone ? <Check size={17} /> : <Circle size={17} />}
                    <span>Ball</span>
                    <small>{ballDone ? "Ready" : "Record last"}</small>
                  </button>
                </div>
                {!recording && selected !== BALL_TAKE && (
                  <Button variant="outline" onClick={hold}>
                    Keep this player still
                  </Button>
                )}
                {!recording && selected === BALL_TAKE && allPlayersDone && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setBallTake(undefined);
                      setBallDone(true);
                      setStage("slate");
                    }}
                  >
                    Let the starting carrier keep the ball
                  </Button>
                )}
                <p className="form-note">
                  Select any recorded player to redo only their take. All takes
                  stay in this draft until you use the slate.
                </p>
              </>
            ) : (
              <>
                <TraceControls
                  value={settings}
                  onChange={(next) => {
                    setSettings(next);
                    setReshape(true);
                  }}
                />
                <p className="form-note">
                  Original recordings are kept. You can also adjust each
                  recorded run from its pencil on the drawing board.
                </p>
                {!complete && (
                  <p className="form-note">
                    Finish recording or hold the remaining players, then record
                    the ball.
                  </p>
                )}
              </>
            )}
          </aside>
        </div>
        <div className="recorder-footer">
          <p className="form-note">
            Using this slate replaces the current movement sequence. Undo on the
            drawing board restores it.
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
            disabled={!complete || recording}
            onClick={() => {
              const next = {
                ...recorded,
                movements: recorded.movements.map((m) => ({ ...m, id: uid() })),
              };
              const result = playSchema.safeParse(next);
              if (!result.success) {
                setMessage(
                  result.error.issues[0]?.message ?? "Check the recorded play.",
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

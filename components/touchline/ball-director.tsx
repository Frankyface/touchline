"use client";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Play as PlayIcon,
  Pause,
  Send,
  Undo2,
  CornerUpRight,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pitch } from "./pitch";
import {
  ballActions,
  ballStateAt,
  ballVisualAt,
  clamp,
  setStartingCarrier,
  totalTime,
  type Play,
} from "@/lib/touchline/model";
import {
  appendBallAction,
  assignKickReceiver,
  nearestReceiver,
  undoBallAction,
} from "@/lib/touchline/ball";

export function BallDirector({
  play,
  onChange,
  escapeRef,
}: {
  play: Play;
  onChange: (play: Play) => void;
  escapeRef: { current: (() => boolean) | null };
}) {
  const [time, setTime] = useState(() => {
    const last = ballActions(play).at(-1);
    return last ? last.start + last.duration : 0;
  });
  const [running, setRunning] = useState(false);
  const [until, setUntil] = useState<number | null>(null);
  const [mode, setMode] = useState<"pass" | "kick">("pass");
  const [message, setMessage] = useState(
    "The ball stays with its carrier. Pause at a moment, choose Pass or Kick, then tap your target.",
  );
  const [history, setHistory] = useState<Play[]>([]);
  const [dragged, setDragged] = useState<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const cancelledPointer = useRef<number | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    pointer: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const duration = totalTime(play);
  const actions = ballActions(play);
  const last = actions.at(-1);
  const loose = !!last && !last.targetId;
  const state = ballStateAt(play, time);
  const carrier = play.players.find((p) => p.id === state.holderId);
  const snap = dragged
    ? nearestReceiver(
        play,
        dragged,
        time,
        mode === "pass" ? (last?.targetId ?? play.ballId) : undefined,
      )
    : undefined;
  const commit = (next: Play) => {
    setHistory((h) => [...h.slice(-19), play]);
    onChange(next);
  };
  useEffect(() => {
    if (!running) return;
    let frame = 0,
      previous = performance.now();
    const end = until ?? duration;
    const tick = (now: number) => {
      const elapsed = (now - previous) / 1000;
      previous = now;
      setTime((t) => Math.min(end, t + elapsed));
      frame = requestAnimationFrame(tick);
    };
    const stop = () => setRunning(false);
    window.addEventListener("blur", stop);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("blur", stop);
    };
  }, [running, until, duration]);
  useEffect(() => {
    if (time >= (until ?? duration)) setRunning(false);
  }, [time, until, duration]);
  const chooseMode = (next: "pass" | "kick") => {
    setRunning(false);
    setMode(next);
    if (last) setTime(Math.max(time, last.start + last.duration));
    setMessage(
      next === "pass"
        ? "Tap a receiver, or drag the ball onto them. They will catch it and carry on."
        : "Tap a player for a caught kick, or tap open space for a landing spot.",
    );
  };
  const send = (target: { x: number; y: number; id?: string }) => {
    if (drag.current) return;
    setRunning(false);
    try {
      if (loose && target.id) {
        const next = assignKickReceiver(play, target.id);
        commit(next);
        setTime(last!.start);
        setUntil(last!.start + last!.duration);
        setRunning(true);
        setMessage(
          "Receiver selected. The kick meets them, then the ball stays with them.",
        );
        return;
      }
      const next = appendBallAction(play, mode, target, time);
      const action = ballActions(next).at(-1)!;
      commit(next);
      setTime(action.start);
      setUntil(action.start + action.duration);
      setRunning(true);
      setMessage(
        mode === "pass"
          ? "Pass added. The receiver now carries the ball."
          : target.id
            ? "Kick added. The receiver catches it at the end of its flight."
            : "Kick lands in space. Tap a player to make them the receiver, or leave the ball there.",
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Choose a target for the ball.",
      );
    }
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
  const clearDrag = () => {
    drag.current = null;
    setDragged(null);
  };
  const cancelDrag = () => {
    if (drag.current) {
      cancelledPointer.current = drag.current.pointer;
      suppressClickUntil.current = Infinity;
    }
    clearDrag();
  };
  useEffect(() => {
    escapeRef.current = () => {
      if (!drag.current) return false;
      cancelDrag();
      setMessage("Ball move cancelled. The previous sequence is kept.");
      return true;
    };
    return () => {
      escapeRef.current = null;
    };
  }, [escapeRef]);
  useEffect(() => {
    const cancel = () => cancelDrag();
    window.addEventListener("blur", cancel);
    return () => window.removeEventListener("blur", cancel);
  }, []);
  return (
    <div className="ball-director recorder-grid">
      <div>
        <div className="ball-tools" role="toolbar" aria-label="Ball actions">
          <Button
            variant={mode === "pass" ? "secondary" : "outline"}
            aria-pressed={mode === "pass"}
            onClick={() => chooseMode("pass")}
          >
            <Send />
            Pass
          </Button>
          <Button
            variant={mode === "kick" ? "secondary" : "outline"}
            aria-pressed={mode === "kick"}
            onClick={() => chooseMode("kick")}
          >
            <CornerUpRight />
            Kick
          </Button>
          <Button
            variant="ghost"
            disabled={!history.length && !actions.length && !play.ballTrace}
            aria-label="Undo ball action"
            onClick={() => {
              const previous =
                history.at(-1) ??
                (play.ballTrace
                  ? { ...play, ballTrace: undefined }
                  : undoBallAction(play));
              onChange(previous);
              setHistory((h) => h.slice(0, -1));
              setTime(0);
              setRunning(false);
              setMessage("Last ball change undone.");
            }}
          >
            <Undo2 />
            Undo
          </Button>
          <div className="ball-preview-controls">
            <Button
              onClick={() => {
                setUntil(null);
                if (time >= duration) setTime(0);
                setRunning(!running);
              }}
              aria-label={running ? "Pause ball preview" : "Play ball preview"}
            >
              {running ? <Pause /> : <PlayIcon />}
              {running ? "Pause" : "Play"}
            </Button>
            <Button
              variant="ghost"
              aria-label="Restart ball preview"
              onClick={() => {
                setRunning(false);
                setTime(0);
              }}
            >
              <RotateCcw />
            </Button>
            <span className="time-display">
              {time.toFixed(1)} / {duration.toFixed(1)}s
            </span>
          </div>
          <span className="possession-badge">
            {play.ballTrace
              ? "Free-drawn route"
              : carrier
                ? `With ${carrier.label}`
                : state.height > 0
                  ? "In flight"
                  : state.offset > 0
                    ? "Passing"
                    : "Ball in space"}
          </span>
        </div>
        <input
          className="ball-timeline"
          type="range"
          aria-label="Ball action time"
          min="0"
          max={duration}
          step="0.05"
          value={time}
          onChange={(e) => {
            setRunning(false);
            setTime(Number(e.target.value));
          }}
        />
        <div
          ref={surface}
          className="recorder-surface ball-surface"
          onClickCapture={(e) => {
            if (performance.now() < suppressClickUntil.current) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onPointerDown={(e) => {
            if (cancelledPointer.current !== null) {
              cancelledPointer.current = null;
              suppressClickUntil.current = 0;
            }
            if (
              e.button !== 0 ||
              !(e.target as Element).closest("[data-ball]") ||
              drag.current ||
              (!state.holderId && !play.ballTrace)
            )
              return;
            const p = coordinates(e);
            if (!p) return;
            const ball = ballVisualAt(play, time);
            setRunning(false);
            drag.current = {
              pointer: e.pointerId,
              ...ball,
              offsetX: ball.x - p.x,
              offsetY: ball.y - p.y,
              originX: e.clientX,
              originY: e.clientY,
              moved: false,
            };
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.pointer !== e.pointerId) return;
            const p = coordinates(e);
            if (!p) return;
            d.moved ||=
              Math.hypot(e.clientX - d.originX, e.clientY - d.originY) > 4;
            d.x = clamp(p.x + d.offsetX);
            d.y = clamp(p.y + d.offsetY);
            if (d.moved) setDragged({ x: d.x, y: d.y });
          }}
          onPointerUp={(e) => {
            if (cancelledPointer.current === e.pointerId) {
              cancelledPointer.current = null;
              suppressClickUntil.current = performance.now() + 500;
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
              return;
            }
            const d = drag.current;
            if (!d || d.pointer !== e.pointerId) return;
            const p = coordinates(e);
            const point = p
              ? { x: clamp(p.x + d.offsetX), y: clamp(p.y + d.offsetY) }
              : { x: d.x, y: d.y };
            const receiver = nearestReceiver(
              play,
              point,
              time,
              mode === "pass" ? (last?.targetId ?? play.ballId) : undefined,
            );
            suppressClickUntil.current = performance.now() + 300;
            clearDrag();
            if (e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.releasePointerCapture(e.pointerId);
            if (d.moved) send({ ...point, id: receiver?.id });
          }}
          onPointerCancel={cancelDrag}
          onLostPointerCapture={cancelDrag}
        >
          <Pitch
            play={play}
            time={time}
            highlighted={snap?.id}
            ballPosition={dragged ?? undefined}
            onBall={() => {}}
            onPlayer={(id) => {
              const p = play.players.find((p) => p.id === id);
              if (p?.team !== "cone" && p) send({ ...p, id });
            }}
            onCanvas={(x, y) => {
              if (mode === "kick") {
                const target = nearestReceiver(play, { x, y }, time);
                send({ x: clamp(x), y: clamp(y), id: target?.id });
              } else
                setMessage(
                  "Choose a player to receive the pass, or use Kick to send the ball into space.",
                );
            }}
          />
        </div>
      </div>
      <aside className="recorder-sidebar">
        <p className="recorder-message" role="status">
          {message}
        </p>

        <label className="field-label">
          Starts with the ball
          <select
            aria-label="Starting ball carrier"
            value={play.ballId}
            onChange={(e) => {
              commit(setStartingCarrier(play, e.target.value));
              setTime(0);
              setRunning(false);
              setMessage(
                "Starting carrier changed. Add passes or kicks when you need them.",
              );
            }}
          >
            {!play.ballId && <option value="">Choose a player</option>}
            {play.players
              .filter((p) => p.team !== "cone")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.team === "attack" ? "Attacker" : "Defender"} {p.label}
                </option>
              ))}
          </select>
        </label>
        <p className="form-note">
          Players carry the ball until a pass or kick. Receivers snap into
          possession and keep moving. New actions follow the last ball action.
        </p>
        {play.ballTrace && (
          <div className="legacy-ball-note">
            <p>Your free-drawn ball route is kept until you add an action.</p>
            <Button
              variant="outline"
              onClick={() => {
                commit({ ...play, ballTrace: undefined });
                setTime(0);
                setRunning(false);
              }}
            >
              Use carrier possession
            </Button>
          </div>
        )}
        {(actions.length > 0 || play.ballTrace) && (
          <Button
            variant="outline"
            onClick={() => {
              commit({
                ...play,
                ballTrace: undefined,
                movements: play.movements.filter((m) => m.kind === "run"),
              });
              setTime(0);
              setRunning(false);
              setMessage(
                "Ball actions cleared. The starting carrier keeps possession.",
              );
            }}
          >
            Clear ball actions
          </Button>
        )}
        <div className="ball-action-list" aria-label="Ball sequence">
          {!actions.length && !play.ballTrace && (
            <p className="empty-small">
              No pass needed? The carrier keeps the ball for the whole play.
            </p>
          )}
          {actions.map((a, i) => (
            <button
              key={a.id}
              onClick={() => {
                setTime(a.start);
                setRunning(false);
              }}
              className="ball-action-row"
            >
              <span>
                {i + 1}. {a.kind === "pass" ? "Pass" : "Kick"} ·{" "}
                {play.players.find((p) => p.id === a.playerId)?.label} →{" "}
                {a.targetId
                  ? play.players.find((p) => p.id === a.targetId)?.label
                  : "space"}
              </span>
              <small>{a.start.toFixed(1)}s</small>
            </button>
          ))}
        </div>
        {loose && (
          <p className="ball-notice">
            Ball lands in space. Tap a player to receive this kick before adding
            another pass or kick.
          </p>
        )}
      </aside>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Pause,
  Play as PlayIcon,
  Plus,
  Printer,
  RotateCcw,
  SkipForward,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  uid,
  type Play,
  type Session,
  type Block,
} from "@/lib/touchline/model";
import { Pitch } from "./pitch";

export function Sessions({
  sessions,
  plays,
  onChange,
  onNew,
  onDelete,
  onDuplicate,
  onPrint,
  disabled,
}: {
  sessions: Session[];
  plays: Play[];
  onChange: (s: Session) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (s: Session) => void;
  onPrint: (s: Session) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState(sessions[0]?.id ?? ""),
    [timer, setTimer] = useState(false);
  const session = sessions.find((s) => s.id === selected) ?? sessions[0];
  useEffect(() => {
    if (sessions.length) setSelected(sessions.at(-1)!.id);
  }, [sessions.length]);
  if (!session)
    return (
      <div className="empty-state">
        <CalendarDays size={32} />
        <h2>Make a little time for a better game.</h2>
        <p>Give your plays a place in the next session.</p>
        <Button onClick={onNew} disabled={disabled}>
          <Plus />
          Create a session
        </Button>
      </div>
    );
  const total = session.blocks.reduce((sum, b) => sum + b.minutes, 0);
  const difference = session.targetMinutes - total;
  const update = (patch: Partial<Session>) =>
    onChange({ ...session, ...patch });
  const blockUpdate = (id: string, patch: Partial<Block>) =>
    update({
      blocks: session.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  const addBlock = (play?: Play) => {
    if (session.blocks.length >= 50) return;
    update({
      blocks: [
        ...session.blocks,
        {
          id: uid(),
          title: play?.title ?? "New practice block",
          minutes: 10,
          notes: play?.cues ?? "",
          equipment: "Balls · cones",
          ...(play ? { playId: play.id } : {}),
        },
      ],
    });
  };
  const move = (index: number, delta: number) => {
    const blocks = [...session.blocks];
    [blocks[index], blocks[index + delta]] = [
      blocks[index + delta],
      blocks[index],
    ];
    update({ blocks });
  };
  return (
    <div className="sessions-layout">
      <aside className="session-list">
        <div className="panel-heading">
          <span>YOUR SESSIONS</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNew}
            disabled={disabled || sessions.length >= 50}
            aria-label="New session"
          >
            <Plus />
          </Button>
        </div>
        {sessions.map((s) => (
          <button
            key={s.id}
            className={
              "play-list-item " + (s.id === session.id ? "active" : "")
            }
            onClick={() => setSelected(s.id)}
          >
            <CalendarDays size={17} />
            <span>
              <strong>{s.title}</strong>
              <small>
                {s.blocks.reduce((v, b) => v + b.minutes, 0)} min ·{" "}
                {s.blocks.length} blocks
              </small>
            </span>
          </button>
        ))}
        <div className="notebook-tip">
          <Clock3 size={20} />
          <p>A plan with room to play.</p>
          <small>Build the session around the ideas you want to explore.</small>
        </div>
      </aside>
      <section className="session-main">
        <div className="session-heading">
          <div>
            <p className="eyebrow">THE NEXT SESSION</p>
            <h2>{session.title}</h2>
          </div>
          <div className="icon-actions">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Duplicate session"
              disabled={disabled}
              onClick={() => onDuplicate(session)}
            >
              <Copy />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Print session plan"
              onClick={() => onPrint(session)}
            >
              <Printer />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete session"
              disabled={disabled}
              onClick={() => onDelete(session.id)}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
        <fieldset disabled={disabled} className="session-meta">
          <label className="session-name">
            Session name
            <Input
              aria-label="Session name"
              value={session.title}
              maxLength={100}
              onChange={(e) => update({ title: e.target.value })}
            />
          </label>
          <label>
            Date
            <Input
              aria-label="Session date"
              type="date"
              value={session.date}
              onChange={(e) => update({ date: e.target.value })}
            />
          </label>
          <label>
            Players
            <Input
              aria-label="Number of players"
              type="number"
              min={1}
              max={60}
              value={session.players}
              onChange={(e) =>
                update({
                  players: Math.max(1, Math.min(60, Number(e.target.value))),
                })
              }
            />
          </label>
          <label>
            Time available
            <Input
              aria-label="Target minutes"
              type="number"
              min={5}
              max={300}
              value={session.targetMinutes}
              onChange={(e) =>
                update({
                  targetMinutes: Math.max(
                    5,
                    Math.min(300, Number(e.target.value)),
                  ),
                })
              }
            />
          </label>
        </fieldset>
        <div className="session-budget">
          <div>
            <strong>{total}</strong>
            <span> / {session.targetMinutes} min</span>
          </div>
          <span className={difference < 0 ? "over-budget" : ""}>
            {difference === 0
              ? "A perfect fit"
              : difference > 0
                ? difference + " minutes to play with"
                : Math.abs(difference) + " minutes over"}
          </span>
          <Button
            onClick={() => setTimer(true)}
            disabled={!session.blocks.length}
          >
            <PlayIcon />
            Start session
          </Button>
        </div>
        <div
          className="session-progress"
          aria-label={total + " minutes planned"}
        >
          {session.blocks.map((b, i) => (
            <div
              key={b.id}
              title={b.title + ": " + b.minutes + " min"}
              style={{
                flex: b.minutes,
                background: [
                  "#285747",
                  "#739173",
                  "#b1c39b",
                  "#b7a078",
                  "#56736b",
                ][i % 5],
              }}
            />
          ))}
        </div>
        <div className="session-blocks">
          {session.blocks.map((b, i) => {
            const linked = plays.find((p) => p.id === b.playId);
            return (
              <article className="session-block" key={b.id}>
                <div className="block-main">
                  <span className="block-index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="block-info">
                    <Input
                      aria-label={"Block " + (i + 1) + " name"}
                      value={b.title}
                      maxLength={100}
                      onChange={(e) =>
                        blockUpdate(b.id, { title: e.target.value })
                      }
                      disabled={disabled}
                    />
                    <span>
                      {linked
                        ? "From your playbook · " + linked.category
                        : "Practice block"}
                    </span>
                  </div>
                  <label className="block-minutes">
                    <Input
                      aria-label={"Block " + (i + 1) + " minutes"}
                      type="number"
                      min={1}
                      max={180}
                      value={b.minutes}
                      onChange={(e) =>
                        blockUpdate(b.id, {
                          minutes: Math.max(
                            1,
                            Math.min(180, Number(e.target.value)),
                          ),
                        })
                      }
                      disabled={disabled}
                    />
                    <span>min</span>
                  </label>
                  <div className="block-actions">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={"Move block " + (i + 1) + " up"}
                      disabled={i === 0 || disabled}
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={"Move block " + (i + 1) + " down"}
                      disabled={i === session.blocks.length - 1 || disabled}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={"Remove block " + (i + 1)}
                      disabled={disabled}
                      onClick={() =>
                        update({
                          blocks: session.blocks.filter((x) => x.id !== b.id),
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <details>
                  <summary>Notes & setup</summary>
                  <div className="block-details">
                    {linked && (
                      <div className="block-diagram">
                        <Pitch play={linked} mini />
                      </div>
                    )}
                    <fieldset disabled={disabled}>
                      <label className="field-label">
                        Coaching notes
                        <Textarea
                          aria-label={"Block " + (i + 1) + " notes"}
                          value={b.notes}
                          maxLength={3000}
                          rows={3}
                          onChange={(e) =>
                            blockUpdate(b.id, { notes: e.target.value })
                          }
                        />
                      </label>
                      <label className="field-label">
                        Equipment
                        <Input
                          aria-label={"Block " + (i + 1) + " equipment"}
                          value={b.equipment}
                          maxLength={500}
                          onChange={(e) =>
                            blockUpdate(b.id, { equipment: e.target.value })
                          }
                        />
                      </label>
                    </fieldset>
                  </div>
                </details>
              </article>
            );
          })}
        </div>
        <div className="add-block">
          <Button
            variant="outline"
            onClick={() => addBlock()}
            disabled={disabled || session.blocks.length >= 50}
          >
            <Plus />
            Practice block
          </Button>
          <Select
            value=""
            onValueChange={(id) => addBlock(plays.find((p) => p.id === id))}
            disabled={disabled || !plays.length || session.blocks.length >= 50}
          >
            <SelectTrigger aria-label="Add a play to this session">
              <SelectValue placeholder="Add from playbook" />
            </SelectTrigger>
            <SelectContent>
              {plays.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="session-footnote">
          Adapt the space and pace to your group. Example blocks use
          non-contact, shadow defence.
        </p>
      </section>
      <SessionTimer
        session={session}
        plays={plays}
        open={timer}
        onClose={() => setTimer(false)}
      />
    </div>
  );
}

function SessionTimer({
  session,
  plays,
  open,
  onClose,
}: {
  session: Session;
  plays: Play[];
  open: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0),
    [remaining, setRemaining] = useState(0),
    [running, setRunning] = useState(false);
  const deadline = useRef(0);
  const block = session.blocks[index];
  const linked = plays.find((p) => p.id === block?.playId);
  useEffect(() => {
    if (open) {
      setIndex(0);
      setRemaining((session.blocks[0]?.minutes ?? 0) * 60);
      setRunning(false);
    }
  }, [open, session.id]);
  useEffect(() => {
    if (!running || !open) return;
    const tick = () => {
      const seconds = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setRemaining(seconds);
      if (seconds === 0) setRunning(false);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [running, open]);
  const toggle = () => {
    if (running) {
      setRemaining(
        Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)),
      );
      setRunning(false);
    } else {
      deadline.current = Date.now() + remaining * 1000;
      setRunning(true);
    }
  };
  const next = () => {
    if (index + 1 >= session.blocks.length) {
      setRunning(false);
      setIndex(session.blocks.length);
      return;
    }
    setIndex(index + 1);
    setRemaining(session.blocks[index + 1].minutes * 60);
    setRunning(false);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setRunning(false);
          onClose();
        }
      }}
    >
      <DialogContent className="timer-dialog">
        <DialogTitle>{block ? block.title : "Session complete"}</DialogTitle>
        <DialogDescription>
          {session.title} ·{" "}
          {block
            ? "Block " + (index + 1) + " of " + session.blocks.length
            : "Good work. Take one idea into the next game."}
        </DialogDescription>
        {block ? (
          <>
            <div
              className="timer-face"
              role="timer"
              aria-label="Time remaining"
            >
              {String(Math.floor(remaining / 60)).padStart(2, "0")}
              <span>:</span>
              {String(remaining % 60).padStart(2, "0")}
            </div>
            {remaining === 0 && (
              <p className="timer-complete">
                Block complete. Ready for the next idea?
              </p>
            )}
            <div className="timer-buttons">
              <Button
                variant="outline"
                size="icon"
                aria-label="Reset block timer"
                onClick={() => {
                  setRunning(false);
                  setRemaining(block.minutes * 60);
                }}
              >
                <RotateCcw />
              </Button>
              <Button
                className="timer-main-button"
                onClick={toggle}
                disabled={remaining === 0}
              >
                {running ? <Pause /> : <PlayIcon />}
                {running ? "Pause" : "Start timer"}
              </Button>
              <Button variant="outline" onClick={next}>
                <SkipForward />
                {index + 1 < session.blocks.length ? "Next block" : "Finish"}
              </Button>
            </div>
            <p className="timer-notes">{block.notes}</p>
            {linked && (
              <div className="timer-pitch">
                <Pitch play={linked} mini />
              </div>
            )}
            <p className="timer-equipment">{block.equipment}</p>
          </>
        ) : (
          <div className="timer-finished">
            <Check size={48} />
            <Button onClick={onClose}>Back to notebook</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

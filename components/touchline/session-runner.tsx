"use client";
import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  Pause,
  Play as PlayIcon,
  Plus,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Play, Session } from "@/lib/touchline/model";
import {
  extendClock,
  formatClock,
  pauseClock,
  secondsRemaining,
  toggleClock,
  type ClockState,
} from "@/lib/touchline/timer";
import { PlaybackBoard } from "./presentation";

export function SessionRunner({
  session,
  plays,
  open,
  review,
  disabled,
  onClose,
  onFinish,
  onReview,
  onDone,
}: {
  session: Session;
  plays: Play[];
  open: boolean;
  review?: Session["review"];
  disabled: boolean;
  onClose: () => void;
  onFinish: () => void;
  onReview: (review: NonNullable<Session["review"]>) => void;
  onDone: () => void;
}) {
  const [blockId, setBlockId] = useState(session.blocks[0]?.id ?? "");
  const [clock, setClock] = useState<ClockState>({
    remaining: (session.blocks[0]?.minutes ?? 0) * 60,
    deadline: null,
  });
  const [now, setNow] = useState(() => Date.now()),
    [finished, setFinished] = useState(false);
  const block = session.blocks.find((b) => b.id === blockId);
  const index = session.blocks.findIndex((b) => b.id === blockId);
  const remaining = secondsRemaining(clock, now);
  const linked = plays.find((p) => p.id === block?.playId);
  const next = session.blocks[index + 1];
  useEffect(() => {
    if (!open) {
      setClock((c) => pauseClock(c, Date.now()));
      return;
    }
    setNow(Date.now());
    if (clock.deadline === null) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [open, clock.deadline]);
  const jump = (id: string) => {
    const destination = session.blocks.find((b) => b.id === id);
    if (!destination) return;
    setBlockId(id);
    setClock({ remaining: destination.minutes * 60, deadline: null });
    setNow(Date.now());
  };
  const close = () => {
    setClock((c) => pauseClock(c, Date.now()));
    onClose();
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent className="coach-dialog">
        <DialogTitle>
          {finished
            ? "What will you take into next time?"
            : (block?.title ?? "No practice blocks")}
        </DialogTitle>
        <DialogDescription>
          {session.title}
          {!finished && block
            ? ` · Block ${index + 1} of ${session.blocks.length}`
            : " · Session reflection"}
        </DialogDescription>
        {finished ? (
          <div className="reflection-form">
            <p className="completion-note">
              <Check size={18} />
              Marked as delivered. Reflection is optional and saves as you type.
            </p>
            <label>
              What worked?
              <Textarea
                value={review?.worked ?? ""}
                maxLength={2000}
                rows={4}
                disabled={disabled}
                onChange={(e) =>
                  onReview({
                    worked: e.target.value,
                    nextTime: review?.nextTime ?? "",
                  })
                }
              />
            </label>
            <label>
              What would you change or revisit?
              <Textarea
                value={review?.nextTime ?? ""}
                maxLength={2000}
                rows={4}
                disabled={disabled}
                onChange={(e) =>
                  onReview({
                    worked: review?.worked ?? "",
                    nextTime: e.target.value,
                  })
                }
              />
            </label>
            <p className="form-note">
              “Plan next session” carries the second note forward into a fresh
              copy.
            </p>
            <Button onClick={onDone}>Back to sessions</Button>
          </div>
        ) : (
          block && (
            <>
              {(session.focus || session.success) && (
                <div className="coach-focus">
                  <span>SESSION FOCUS</span>
                  {session.focus && <p>{session.focus}</p>}
                  {session.success && (
                    <small>Look for: {session.success}</small>
                  )}
                </div>
              )}
              <div className="coach-layout">
                <div className="coach-timing">
                  <div
                    className={
                      "timer-face " + (remaining < 0 ? "overtime" : "")
                    }
                    role="timer"
                    aria-label={
                      remaining < 0
                        ? "Time over planned duration"
                        : "Time remaining"
                    }
                  >
                    {formatClock(remaining)}
                  </div>
                  <p className="clock-caption">
                    {remaining <= 0
                      ? "Planned time is up. Move on when you’re ready."
                      : `${block.minutes} min planned · ${clock.deadline === null ? "Paused" : "Running"}`}
                  </p>
                  <div className="timer-buttons">
                    <Button
                      className="timer-main-button"
                      onClick={() => {
                        setNow(Date.now());
                        setClock((c) => toggleClock(c, Date.now()));
                      }}
                    >
                      {clock.deadline !== null ? <Pause /> : <PlayIcon />}
                      {clock.deadline !== null ? "Pause" : "Start"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNow(Date.now());
                        setClock((c) => extendClock(c, 60));
                      }}
                    >
                      <Plus />1 min
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Reset this block timer"
                      onClick={() => jump(block.id)}
                    >
                      <RotateCcw />
                    </Button>
                  </div>
                  {next && (
                    <div className="up-next">
                      <span>UP NEXT</span>
                      <strong>{next.title}</strong>
                      <small>{next.minutes} minutes</small>
                    </div>
                  )}
                  <div className="coach-navigation">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Previous block"
                      disabled={index === 0}
                      onClick={() => jump(session.blocks[index - 1].id)}
                    >
                      <ChevronLeft />
                    </Button>
                    <Button
                      disabled={!next && disabled}
                      onClick={() => {
                        if (next) jump(next.id);
                        else {
                          setClock((c) => pauseClock(c, Date.now()));
                          setFinished(true);
                          onFinish();
                        }
                      }}
                    >
                      <SkipForward />
                      {next ? "Next block" : "Finish & review"}
                    </Button>
                  </div>
                  <Select value={blockId} onValueChange={jump}>
                    <SelectTrigger aria-label="Jump to practice block">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {session.blocks.map((b, i) => (
                        <SelectItem key={b.id} value={b.id}>
                          {i + 1}. {b.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="form-note">
                    Closing pauses the timer. Your place stays in this tab. Live
                    time changes leave the saved plan unchanged.
                  </p>
                </div>
                <div className="coach-content">
                  {linked && (
                    <PlaybackBoard key={block.id + linked.id} play={linked} />
                  )}
                  {block.setup && (
                    <section>
                      <h3>Setup</h3>
                      <p>{block.setup}</p>
                    </section>
                  )}
                  {block.notes && (
                    <section>
                      <h3>Coaching cues</h3>
                      <p>{block.notes}</p>
                    </section>
                  )}
                  {block.equipment && (
                    <section>
                      <h3>Equipment</h3>
                      <p>{block.equipment}</p>
                    </section>
                  )}
                  {(block.easier || block.challenge) && (
                    <div className="adaptations">
                      {block.easier && (
                        <section>
                          <h3>Make easier</h3>
                          <p>{block.easier}</p>
                        </section>
                      )}
                      {block.challenge && (
                        <section>
                          <h3>Add challenge</h3>
                          <p>{block.challenge}</p>
                        </section>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}

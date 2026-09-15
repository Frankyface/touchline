"use client";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play as PlayIcon,
  RotateCcw,
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { totalTime, type Play } from "@/lib/touchline/model";
import { Pitch } from "./pitch";

export function PlaybackBoard({ play }: { play: Play }) {
  const [time, setTime] = useState(0),
    [running, setRunning] = useState(false),
    [focus, setFocus] = useState("all");
  const duration = totalTime(play);
  const moments = [
    ...new Set([
      0,
      ...play.movements.flatMap((m) => [m.start, m.start + m.duration]),
      duration,
    ]),
  ].sort((a, b) => a - b);
  useEffect(() => {
    if (!running) return;
    let frame = 0,
      previous = performance.now();
    const tick = (now: number) => {
      const delta = (now - previous) / 1000;
      previous = now;
      setTime((t) => Math.min(duration, t + delta));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, duration]);
  useEffect(() => {
    if (time >= duration) setRunning(false);
  }, [time, duration]);
  const step = (direction: number) => {
    setRunning(false);
    setTime(
      direction > 0
        ? (moments.find((t) => t > time + 0.01) ?? duration)
        : ([...moments].reverse().find((t) => t < time - 0.01) ?? 0),
    );
  };
  return (
    <div className="play-presentation">
      <Pitch
        play={play}
        time={time}
        focusPlayer={focus === "all" ? undefined : focus}
      />
      <div className="presentation-controls">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous moment"
          disabled={time <= 0}
          onClick={() => step(-1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          aria-label={running ? "Pause play" : "Play diagram"}
          onClick={() => {
            if (time >= duration) setTime(0);
            setRunning(!running);
          }}
        >
          {running ? <Pause /> : <PlayIcon />}
          {running ? "Pause" : "Play"}
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next moment"
          disabled={time >= duration}
          onClick={() => step(1)}
        >
          <ChevronRight />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Restart play"
          onClick={() => {
            setTime(0);
            setRunning(false);
          }}
        >
          <RotateCcw />
        </Button>
        <span className="time-display">
          {time.toFixed(1)} / {duration.toFixed(1)}s
        </span>
      </div>
      <Slider
        aria-label="Presentation timeline"
        value={[time]}
        min={0}
        max={duration}
        step={0.05}
        onValueChange={([v]) => {
          setTime(v);
          setRunning(false);
        }}
      />
      <Select value={focus} onValueChange={setFocus}>
        <SelectTrigger aria-label="Focus on a player">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All players</SelectItem>
          {play.players
            .filter((p) => p.team !== "cone")
            .map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.team === "attack" ? "Attacker" : "Defender"} {p.label}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export function Presentation({
  play,
  onClose,
}: {
  play: Play;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="presentation-dialog">
        <DialogTitle>{play.title}</DialogTitle>
        <DialogDescription>
          {play.description || "Step through the play, or focus on one player."}
        </DialogDescription>
        <PlaybackBoard play={play} />
        {play.cues && (
          <div className="presentation-cues">
            <h3>Look for</h3>
            <ul>
              {play.cues
                .split("\n")
                .filter(Boolean)
                .map((cue, i) => (
                  <li key={i}>{cue}</li>
                ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

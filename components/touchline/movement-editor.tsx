"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Movement, Play } from "@/lib/touchline/model";
import { playSchema } from "@/lib/touchline/validation";
import { TraceControls } from "./play-recorder";

export function MovementEditor({
  play,
  movement,
  onApply,
  onClose,
}: {
  play: Play;
  movement: Movement;
  onApply: (m: Movement) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({
    start: String(movement.start),
    duration: String(movement.duration),
    x: String(movement.x),
    y: String(movement.y),
  });
  const [error, setError] = useState("");
  const [trace, setTrace] = useState(movement.trace);
  const label = play.players.find((p) => p.id === movement.playerId)?.label;
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle>
          {movement.kind === "run"
            ? `Edit ${label}’s run`
            : `Edit ${label}’s ${movement.kind}`}
        </DialogTitle>
        <DialogDescription>
          Adjust this movement. Other movements keep their timing.
        </DialogDescription>
        <form
          className="movement-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (Object.values(draft).some((v) => !v.trim())) {
              setError("Fill in each timing and position field.");
              return;
            }
            const next = {
              ...movement,
              start: Number(draft.start),
              duration: Number(draft.duration),
              x: Number(draft.x),
              y: Number(draft.y),
              ...(trace ? { trace } : {}),
            };
            const valid = playSchema.safeParse({
              ...play,
              movements: play.movements.map((m) =>
                m.id === next.id ? next : m,
              ),
            });
            if (!valid.success) {
              setError(
                valid.error.issues[0]?.message ?? "Check this movement.",
              );
              return;
            }
            onApply(next);
            onClose();
          }}
        >
          <div className="two-fields">
            <label>
              Starts at (seconds)
              <Input
                type="number"
                min={0}
                max={180}
                step="any"
                value={draft.start}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, start: e.target.value }))
                }
              />
            </label>
            <label>
              Duration (seconds)
              <Input
                type="number"
                min={0.2}
                max={30}
                step="any"
                value={draft.duration}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, duration: e.target.value }))
                }
              />
            </label>
          </div>
          {movement.kind === "run" || !movement.targetId ? (
            <div className="two-fields">
              <label>
                Finish X
                <Input
                  type="number"
                  min={3}
                  max={97}
                  step="any"
                  value={draft.x}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, x: e.target.value }))
                  }
                />
              </label>
              <label>
                Finish Y
                <Input
                  type="number"
                  min={3}
                  max={97}
                  step="any"
                  value={draft.y}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, y: e.target.value }))
                  }
                />
              </label>
            </div>
          ) : (
            <p className="form-note">
              This ball action follows receiver{" "}
              {play.players.find((p) => p.id === movement.targetId)?.label} at
              the arrival time.
            </p>
          )}
          {trace && (
            <TraceControls
              value={trace}
              onChange={(settings) => setTrace({ ...trace, ...settings })}
            />
          )}
          {trace && (
            <p className="form-note">
              Timing changes retime the recorded movement. Start/end edits
              reshape the route; the original recording stays available.
            </p>
          )}
          <p className="form-note">
            Runs for the same player cannot overlap. Passes and kicks must stay
            in possession order.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Apply movement</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

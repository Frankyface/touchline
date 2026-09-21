import type { Play, Movement, NotebookData } from "./model";
// @ts-ignore Node tests import TypeScript directly.
import { finishTrace, type Trace, type TracePoint } from "./trace.ts";

export const BALL_TAKE = Symbol("ball take");
export type RecordingSelection = string | typeof BALL_TAKE;

export function recordedSlate(
  play: Play,
  takes: Record<string, TracePoint[]>,
  replaced: Set<string>,
  duration: number,
  settings: Omit<Trace, "points">,
  reshape: boolean,
  ballTake?: TracePoint[],
): Play {
  const movements = play.players
    .filter((p) => p.team !== "cone")
    .flatMap((p) => {
      const original = play.movements.filter(
        (m) => m.playerId === p.id && m.kind === "run",
      );
      if (!Object.hasOwn(takes, p.id)) return original;
      if (!replaced.has(p.id) && original.some((m) => m.trace)) {
        return original.map((m) =>
          reshape && m.trace ? { ...m, trace: { ...m.trace, ...settings } } : m,
        );
      }
      const points = takes[p.id],
        end = points[points.length - 1];
      return [
        {
          id: `recorded-${p.id}`,
          playerId: p.id,
          kind: "run",
          start: 0,
          duration,
          x: end.x,
          y: end.y,
          trace: { points, ...settings },
        } satisfies Movement,
      ];
    });
  return {
    ...play,
    clipDuration: duration,
    movements: [
      ...movements,
      ...(ballTake ? [] : play.movements.filter((m) => m.kind !== "run")),
    ],
    ballTrace: ballTake
      ? ballTake === play.ballTrace?.points
        ? play.ballTrace
        : { points: ballTake, ...settings }
      : undefined,
  };
}

export function notebookBackup(data: NotebookData): string {
  return JSON.stringify({ format: "touchline-notebook", version: 1, data });
}

// Leave room for later text edits and the save envelope below the 2 MB limit.
export function notebookSizeError(data: NotebookData): string | undefined {
  if (new TextEncoder().encode(notebookBackup(data)).byteLength > 1_900_000)
    return "This notebook is nearly full. Export a backup, then remove some plays before adding this recording or copy.";
}

// Ball launches during a take must use the route being performed, not the old run.
export function capturePreview(
  play: Play,
  playerId: string,
  samples: TracePoint[],
  point: { x: number; y: number },
  time: number,
  duration: number,
): Play {
  const points = finishTrace(
    [...samples, { ...point, t: time }],
    time,
    duration,
  );
  return {
    ...play,
    movements: [
      ...play.movements.filter(
        (m) => m.kind !== "run" || m.playerId !== playerId,
      ),
      {
        id: "capture-preview",
        playerId,
        kind: "run",
        x: point.x,
        y: point.y,
        start: 0,
        duration,
        trace: { points, mode: "natural", edges: 6, straighten: 100 },
      },
    ],
  };
}

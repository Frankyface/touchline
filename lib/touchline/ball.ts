// @ts-ignore Node's model tests import TypeScript directly.
import { ballActions, positionAt, uid, type Play } from "./model.ts";

export function nearestReceiver(
  play: Play,
  point: { x: number; y: number },
  time: number,
  exclude?: string,
  radius = 8,
) {
  return play.players
    .filter((p) => p.team !== "cone" && p.id !== exclude)
    .map((p) => ({
      player: p,
      distance: Math.hypot(
        positionAt(play, p.id, time).x - point.x,
        ((positionAt(play, p.id, time).y - point.y) * 620) / 700,
      ),
    }))
    .filter((p) => p.distance <= radius)
    .sort((a, b) => a.distance - b.distance)[0]?.player;
}

export function appendBallAction(
  play: Play,
  kind: "pass" | "kick",
  target: { x: number; y: number; id?: string },
  time: number,
): Play {
  const last = ballActions(play).at(-1);
  const sender = last ? last.targetId : play.ballId;
  if (!sender)
    throw new Error(
      "The ball is in space. Choose a receiver for the last kick, or undo it.",
    );
  if (!play.players.some((p) => p.id === sender && p.team !== "cone"))
    throw new Error("Choose a starting carrier first.");
  if (kind === "pass" && (!target.id || target.id === sender))
    throw new Error("Choose another player to receive the pass.");
  if (
    target.id &&
    !play.players.some((p) => p.id === target.id && p.team !== "cone")
  )
    throw new Error("Choose a player to receive the ball.");
  if (play.movements.length >= 120)
    throw new Error("Remove a movement before adding another ball action.");
  const start = Math.max(time, last ? last.start + last.duration : 0, 0);
  if (start > 180)
    throw new Error("This play has reached its three-minute sequence limit.");
  return {
    ...play,
    ballTrace: undefined,
    movements: [
      ...play.movements,
      {
        id: uid(),
        kind,
        playerId: sender,
        targetId: target.id,
        x: target.x,
        y: target.y,
        start,
        duration: kind === "pass" ? 0.7 : 1.4,
      },
    ],
  };
}

export function assignKickReceiver(play: Play, playerId: string): Play {
  const last = ballActions(play).at(-1);
  if (!last || last.kind !== "kick" || last.targetId) return play;
  if (!play.players.some((p) => p.id === playerId && p.team !== "cone"))
    return play;
  return {
    ...play,
    movements: play.movements.map((m) =>
      m.id === last.id ? { ...m, targetId: playerId } : m,
    ),
  };
}

export function undoBallAction(play: Play): Play {
  const last = ballActions(play).at(-1);
  return {
    ...play,
    movements: play.movements.filter((m) => m.id !== last?.id),
  };
}

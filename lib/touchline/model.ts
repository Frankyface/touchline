export type Team = "attack" | "defence" | "cone";
export type Player = {
  id: string;
  label: string;
  team: Team;
  x: number;
  y: number;
};
export type Movement = {
  id: string;
  playerId: string;
  kind: "run" | "pass";
  x: number;
  y: number;
  targetId?: string;
  start: number;
  duration: number;
};
export type Play = {
  id: string;
  title: string;
  category: string;
  description: string;
  cues: string;
  players: Player[];
  movements: Movement[];
  ballId: string;
  updatedAt: string;
};
export type Block = {
  id: string;
  title: string;
  minutes: number;
  notes: string;
  equipment: string;
  playId?: string;
};
export type Session = {
  id: string;
  title: string;
  date: string;
  players: number;
  targetMinutes: number;
  blocks: Block[];
};
export type NotebookData = { plays: Play[]; sessions: Session[] };
export function restoreRemoved(
  current: NotebookData,
  before: NotebookData,
  type: "play" | "session",
  id: string,
): NotebookData {
  if (type === "session") {
    const record = before.sessions.find((s) => s.id === id);
    if (
      !record ||
      current.sessions.some((s) => s.id === id) ||
      current.sessions.length >= 50
    )
      return current;
    const sessions = [...current.sessions];
    sessions.splice(
      Math.min(
        before.sessions.findIndex((s) => s.id === id),
        sessions.length,
      ),
      0,
      {
        ...record,
        blocks: record.blocks.map((b) => ({
          ...b,
          playId: current.plays.some((p) => p.id === b.playId)
            ? b.playId
            : undefined,
        })),
      },
    );
    return { ...current, sessions };
  }
  const record = before.plays.find((p) => p.id === id);
  if (
    !record ||
    current.plays.some((p) => p.id === id) ||
    current.plays.length >= 100
  )
    return current;
  const plays = [...current.plays];
  plays.splice(
    Math.min(
      before.plays.findIndex((p) => p.id === id),
      plays.length,
    ),
    0,
    record,
  );
  return {
    plays,
    sessions: current.sessions.map((s) => ({
      ...s,
      blocks: s.blocks.map((b) =>
        !b.playId &&
        before.sessions
          .find((old) => old.id === s.id)
          ?.blocks.some((old) => old.id === b.id && old.playId === id)
          ? { ...b, playId: id }
          : b,
      ),
    })),
  };
}
export const uid = () => crypto.randomUUID();
export const clamp = (v: number, min = 4, max = 96) =>
  Math.max(min, Math.min(max, v));
export const totalTime = (play: Play) =>
  Math.max(6, ...play.movements.map((m) => m.start + m.duration));
export function positionAt(play: Play, playerId: string, time: number) {
  const player = play.players.find((p) => p.id === playerId);
  let x = player?.x ?? 50,
    y = player?.y ?? 50;
  for (const move of play.movements
    .filter((m) => m.playerId === playerId && m.kind === "run")
    .sort((a, b) => a.start - b.start)) {
    if (time < move.start) break;
    const progress = Math.min(
      1,
      Math.max(0, (time - move.start) / move.duration),
    );
    x += (move.x - x) * progress;
    y += (move.y - y) * progress;
    if (progress < 1) break;
  }
  return { x, y };
}
export function ballAt(play: Play, time: number) {
  let holder = play.ballId;
  for (const pass of play.movements
    .filter((m) => m.kind === "pass")
    .sort((a, b) => a.start - b.start)) {
    if (time < pass.start) break;
    const from = positionAt(play, pass.playerId, pass.start);
    const to = pass.targetId
      ? positionAt(play, pass.targetId, pass.start + pass.duration)
      : { x: pass.x, y: pass.y };
    if (time < pass.start + pass.duration) {
      const k = (time - pass.start) / pass.duration;
      return {
        x: from.x + (to.x - from.x) * k,
        y: from.y + (to.y - from.y) * k,
      };
    }
    holder = pass.targetId ?? holder;
  }
  return positionAt(play, holder, time);
}
export const firstPlay: Play = {
  id: "wide-door",
  title: "The wide door",
  category: "Attack",
  description: "Hold the inside defender. Give the outside runner room to go.",
  cues: "Stay square before the pass.\nKeep enough depth to receive behind the ball.\nAccelerate into the space, then reconnect in support.",
  ballId: "a10",
  updatedAt: "2026-09-15T00:00:00.000Z",
  players: [
    { id: "a10", label: "10", team: "attack", x: 30, y: 69 },
    { id: "a12", label: "12", team: "attack", x: 51, y: 76 },
    { id: "a14", label: "14", team: "attack", x: 77, y: 83 },
    { id: "d1", label: "1", team: "defence", x: 33, y: 39 },
    { id: "d2", label: "2", team: "defence", x: 58, y: 42 },
  ],
  movements: [
    {
      id: "r1",
      kind: "run",
      playerId: "a10",
      x: 32,
      y: 51,
      start: 0,
      duration: 2,
    },
    {
      id: "r2",
      kind: "run",
      playerId: "a12",
      x: 52,
      y: 58,
      start: 0,
      duration: 2,
    },
    {
      id: "r3",
      kind: "run",
      playerId: "a14",
      x: 78,
      y: 68,
      start: 0,
      duration: 2,
    },
    {
      id: "p1",
      kind: "pass",
      playerId: "a10",
      targetId: "a12",
      x: 52,
      y: 58,
      start: 1.5,
      duration: 0.6,
    },
    {
      id: "p2",
      kind: "pass",
      playerId: "a12",
      targetId: "a14",
      x: 78,
      y: 68,
      start: 2.3,
      duration: 0.6,
    },
    {
      id: "r4",
      kind: "run",
      playerId: "a14",
      x: 84,
      y: 25,
      start: 3,
      duration: 3,
    },
  ],
};
const insidePlay: Play = {
  ...firstPlay,
  id: "inside-door",
  title: "The inside door",
  description:
    "Change the question. Bring a receiver back behind the ball and into a new channel.",
  cues: "Switch behind the carrier.\nShow the receiver a clear target.\nKeep a wide support option available.",
  players: [
    { id: "a10", label: "10", team: "attack", x: 42, y: 82 },
    { id: "a12", label: "12", team: "attack", x: 66, y: 88 },
    { id: "a14", label: "11", team: "attack", x: 24, y: 91 },
    { id: "d1", label: "1", team: "defence", x: 51, y: 47 },
    { id: "d2", label: "2", team: "defence", x: 26, y: 46 },
  ],
  movements: [
    {
      id: "r1",
      kind: "run",
      playerId: "a10",
      x: 57,
      y: 63,
      start: 0,
      duration: 2,
    },
    {
      id: "r2",
      kind: "run",
      playerId: "a12",
      x: 60,
      y: 78,
      start: 0,
      duration: 1,
    },
    {
      id: "r3",
      kind: "run",
      playerId: "a12",
      x: 51,
      y: 70,
      start: 1,
      duration: 1,
    },
    {
      id: "r4",
      kind: "run",
      playerId: "a14",
      x: 26,
      y: 76,
      start: 0,
      duration: 2,
    },
    {
      id: "p1",
      kind: "pass",
      playerId: "a10",
      targetId: "a12",
      x: 51,
      y: 70,
      start: 2,
      duration: 0.6,
    },
    {
      id: "r5",
      kind: "run",
      playerId: "a12",
      x: 42,
      y: 55,
      start: 2.6,
      duration: 2,
    },
    {
      id: "r6",
      kind: "run",
      playerId: "a14",
      x: 27,
      y: 63,
      start: 2.6,
      duration: 2,
    },
    {
      id: "p2",
      kind: "pass",
      playerId: "a12",
      targetId: "a14",
      x: 27,
      y: 63,
      start: 4.6,
      duration: 0.6,
    },
    {
      id: "r7",
      kind: "run",
      playerId: "a14",
      x: 20,
      y: 28,
      start: 5.2,
      duration: 2.8,
    },
  ],
};
const loopPlay: Play = {
  ...firstPlay,
  id: "return-ticket",
  title: "The return ticket",
  description:
    "The pass starts your next job. Loop behind the receiver and become an option again.",
  cues: "Reappear behind the ball.\nCommunicate before the return pass.\nCompare the loop with the direct outside option.",
  players: [
    { id: "a10", label: "10", team: "attack", x: 34, y: 82 },
    { id: "a12", label: "12", team: "attack", x: 54, y: 87 },
    { id: "a14", label: "14", team: "attack", x: 79, y: 91 },
    { id: "d1", label: "1", team: "defence", x: 44, y: 48 },
    { id: "d2", label: "2", team: "defence", x: 74, y: 45 },
  ],
  movements: [
    {
      id: "r1",
      kind: "run",
      playerId: "a10",
      x: 37,
      y: 70,
      start: 0,
      duration: 1,
    },
    {
      id: "r2",
      kind: "run",
      playerId: "a12",
      x: 55,
      y: 76,
      start: 0,
      duration: 1,
    },
    {
      id: "r3",
      kind: "run",
      playerId: "a14",
      x: 80,
      y: 82,
      start: 0,
      duration: 1,
    },
    {
      id: "p1",
      kind: "pass",
      playerId: "a10",
      targetId: "a12",
      x: 55,
      y: 76,
      start: 1,
      duration: 0.6,
    },
    {
      id: "r4",
      kind: "run",
      playerId: "a10",
      x: 45,
      y: 85,
      start: 1.6,
      duration: 1,
    },
    {
      id: "r5",
      kind: "run",
      playerId: "a10",
      x: 67,
      y: 82,
      start: 2.6,
      duration: 1,
    },
    {
      id: "r6",
      kind: "run",
      playerId: "a10",
      x: 70,
      y: 69,
      start: 3.6,
      duration: 1,
    },
    {
      id: "r7",
      kind: "run",
      playerId: "a12",
      x: 56,
      y: 61,
      start: 1.6,
      duration: 3,
    },
    {
      id: "r8",
      kind: "run",
      playerId: "a14",
      x: 83,
      y: 75,
      start: 1.6,
      duration: 3,
    },
    {
      id: "p2",
      kind: "pass",
      playerId: "a12",
      targetId: "a10",
      x: 70,
      y: 69,
      start: 4.6,
      duration: 0.6,
    },
    {
      id: "r9",
      kind: "run",
      playerId: "a10",
      x: 74,
      y: 49,
      start: 5.2,
      duration: 2,
    },
    {
      id: "r10",
      kind: "run",
      playerId: "a14",
      x: 87,
      y: 57,
      start: 5.2,
      duration: 2,
    },
    {
      id: "p3",
      kind: "pass",
      playerId: "a10",
      targetId: "a14",
      x: 87,
      y: 57,
      start: 7.2,
      duration: 0.6,
    },
    {
      id: "r11",
      kind: "run",
      playerId: "a14",
      x: 88,
      y: 26,
      start: 7.8,
      duration: 2.2,
    },
  ],
};
export const initialData: NotebookData = {
  plays: [firstPlay, insidePlay, loopPlay],
  sessions: [
    {
      id: "find-the-space",
      title: "Find the space",
      date: "",
      players: 12,
      targetMinutes: 60,
      blocks: [
        {
          id: "b1",
          title: "Find the window",
          minutes: 8,
          notes:
            "Trios jog through a channel, changing who carries. Give the carrier two visible options. Hands ready; adjust your depth; pass and support.",
          equipment: "1 ball and 4 cones per trio",
        },
        {
          id: "b2",
          title: "Hold the edge",
          minutes: 10,
          notes:
            "Three attackers and two shadow defenders. Look before receiving. Keep width and choose when to pass.",
          equipment: "1 ball · 6 cones · 2 bibs",
          playId: "wide-door",
        },
        {
          id: "b3",
          title: "Change the question",
          minutes: 10,
          notes:
            "Compare a straight carry with an inside switch. Change direction behind the carrier; leave room and name the receiver.",
          equipment: "1 ball · 4 cones · 1 bib",
          playId: "inside-door",
        },
        {
          id: "b4",
          title: "Pass and reappear",
          minutes: 12,
          notes:
            "Try the loop, then compare it with a direct pass. Keep the return option behind the ball. Communicate early.",
          equipment: "1 ball · 6 cones · 2 bibs",
          playId: "return-ticket",
        },
        {
          id: "b5",
          title: "Build your finish",
          minutes: 10,
          notes:
            "Choose one pattern, walk it, then try it at a comfortable pace. Explain the space you want; change one thing; try again.",
          equipment: "1 ball · 8 cones · 2 bibs",
        },
      ],
    },
  ],
};

import { z } from "zod";
const id = z.string().min(1).max(100);
const point = z.number().finite().min(3).max(97);
const trace = z.object({
  points: z.array(z.object({ x: point, y: point, t: z.number().finite().min(0).max(1) }).strict()).min(2).max(604),
  mode: z.enum(["natural", "polygon"]),
  edges: z.number().int().min(1).max(24),
  straighten: z.number().finite().min(0).max(100),
}).strict().superRefine((value, ctx) => {
  if (value.points[0]?.t !== 0 || value.points.at(-1)?.t !== 1 || value.points.some((p, i) => i > 0 && p.t <= value.points[i - 1].t))
    ctx.addIssue({ code: "custom", message: "Recorded points must run from 0 to 1 in time order" });
});
const player = z
  .object({
    id,
    label: z.string().min(1).max(4),
    team: z.enum(["attack", "defence", "cone"]),
    x: point,
    y: point,
  })
  .strict();
const movement = z
  .object({
    id,
    playerId: id,
    kind: z.enum(["run", "pass"]),
    x: point,
    y: point,
    targetId: id.optional(),
    start: z.number().finite().min(0).max(180),
    duration: z.number().finite().min(0.2).max(30),
    trace: trace.optional(),
  })
  .strict();
export const playSchema = z
  .object({
    id,
    title: z.string().trim().min(1).max(100),
    category: z.enum(["Attack", "Defence", "Set piece", "Skills"]),
    description: z.string().max(1000),
    cues: z.string().max(3000),
    setup: z.string().max(1000).optional(),
    equipment: z.string().max(500).optional(),
    easier: z.string().max(1000).optional(),
    challenge: z.string().max(1000).optional(),
    favorite: z.boolean().optional(),
    clipDuration: z.number().finite().min(1).max(30).optional(),
    ballTrace: trace.optional(),
    players: z.array(player).max(40),
    movements: z.array(movement).max(120),
    ballId: z.string().max(100),
    updatedAt: z.string().max(40),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.ballTrace && (!p.clipDuration || p.movements.some(m => m.kind === "pass")))
      ctx.addIssue({ code: "custom", message: "A recorded ball route needs a clip duration and replaces authored passes" });
    const ids = new Set(p.players.map((x) => x.id));
    if (
      ids.size !== p.players.length ||
      new Set(p.movements.map((m) => m.id)).size !== p.movements.length
    )
      ctx.addIssue({ code: "custom", message: "Duplicate diagram IDs" });
    if (
      p.ballId &&
      !p.players.some((x) => x.id === p.ballId && x.team !== "cone")
    )
      ctx.addIssue({ code: "custom", message: "Unknown ball carrier" });
    for (const m of p.movements) {
      if (m.trace && (m.kind !== "run" || p.players.find(p => p.id === m.playerId)?.team === "cone"))
        ctx.addIssue({ code: "custom", message: "Only player runs can have a recorded route" });
      if (
        !ids.has(m.playerId) ||
        (m.kind === "pass" && (!m.targetId || !ids.has(m.targetId)))
      )
        ctx.addIssue({
          code: "custom",
          message: "A movement refers to a missing player",
        });
    }
    for (const pId of ids) {
      const runs = p.movements
        .filter((m) => m.kind === "run" && m.playerId === pId)
        .sort((a, b) => a.start - b.start);
      for (let n = 1; n < runs.length; n++) {
        if (runs[n].start + 0.001 < runs[n - 1].start + runs[n - 1].duration)
          ctx.addIssue({
            code: "custom",
            message: "A player's runs cannot overlap",
          });
      }
    }
    const passes = p.movements
      .filter((m) => m.kind === "pass")
      .sort((a, b) => a.start - b.start);
    let holder = p.ballId;
    let end = 0;
    for (const pass of passes) {
      if (pass.playerId !== holder || pass.start + 0.001 < end)
        ctx.addIssue({
          code: "custom",
          message: "Passes must follow the ball carrier in sequence",
        });
      holder = pass.targetId ?? holder;
      end = pass.start + pass.duration;
    }
  });
const block = z
  .object({
    id,
    title: z.string().trim().min(1).max(100),
    minutes: z.number().int().min(1).max(180),
    notes: z.string().max(3000),
    equipment: z.string().max(500),
    playId: id.optional(),
    setup: z.string().max(1000).optional(),
    easier: z.string().max(1000).optional(),
    challenge: z.string().max(1000).optional(),
  })
  .strict();
const session = z
  .object({
    id,
    title: z.string().trim().min(1).max(100),
    date: z.string().refine((s) => s === "" || /^\d{4}-\d{2}-\d{2}$/.test(s)),
    players: z.number().int().min(1).max(60),
    targetMinutes: z.number().int().min(5).max(300),
    blocks: z.array(block).max(50),
    focus: z.string().max(500).optional(),
    success: z.string().max(500).optional(),
    completedAt: z.string().datetime().optional(),
    carriedForward: z.string().max(2000).optional(),
    review: z
      .object({ worked: z.string().max(2000), nextTime: z.string().max(2000) })
      .strict()
      .optional(),
  })
  .strict();
export const notebookSchema = z
  .object({
    plays: z.array(playSchema).max(100),
    sessions: z.array(session).max(50),
  })
  .strict()
  .superRefine((data, ctx) => {
    const ids = new Set(data.plays.map((p) => p.id));
    if (
      ids.size !== data.plays.length ||
      new Set(data.sessions.map((s) => s.id)).size !== data.sessions.length
    )
      ctx.addIssue({ code: "custom", message: "Duplicate record IDs" });
    for (const s of data.sessions) {
      if (new Set(s.blocks.map((b) => b.id)).size !== s.blocks.length)
        ctx.addIssue({
          code: "custom",
          message: "Duplicate session block IDs",
        });
      for (const b of s.blocks)
        if (b.playId && !ids.has(b.playId))
          ctx.addIssue({
            code: "custom",
            message: "Session links to an unknown play",
          });
    }
  });
export const saveSchema = z
  .object({ revision: z.number().int().min(0), data: notebookSchema })
  .strict();

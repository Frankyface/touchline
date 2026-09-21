import test from "node:test";
import assert from "node:assert/strict";
import {
  finishTrace,
  traceAt,
  tracePoints,
  polygonIndices,
  anchoredTrace,
} from "../lib/touchline/trace.ts";
import {
  firstPlay,
  positionAt,
  ballAt,
  totalTime,
  mirrorPlay,
  setStartingCarrier,
  mergeRecovery,
} from "../lib/touchline/model.ts";
import { playSchema, notebookSchema } from "../lib/touchline/validation.ts";

const points = [
  { x: 30, y: 69, t: 0 },
  { x: 30, y: 69, t: 0.2 },
  { x: 40, y: 55, t: 0.4 },
  { x: 40, y: 55, t: 0.6 },
  { x: 60, y: 50, t: 1 },
];
const trace = { points, mode: "natural", edges: 2, straighten: 100 };
const recorded = () => ({
  ...structuredClone(firstPlay),
  clipDuration: 5,
  movements: [
    {
      id: "take-a10",
      playerId: "a10",
      kind: "run",
      x: 60,
      y: 50,
      start: 0,
      duration: 5,
      trace: structuredClone(trace),
    },
    {
      id: "take-a12",
      playerId: "a12",
      kind: "run",
      x: 70,
      y: 40,
      start: 0,
      duration: 5,
      trace: {
        ...trace,
        points: [
          { x: 51, y: 76, t: 0 },
          { x: 70, y: 40, t: 1 },
        ],
      },
    },
  ],
});

test("captured delayed starts, pauses and early releases keep their real timeline", () => {
  const path = finishTrace(
    [
      { x: 20, y: 30, t: 0 },
      { x: 20, y: 30, t: 1 },
      { x: 40, y: 50, t: 2 },
    ],
    2,
    5,
  );
  assert.deepEqual(traceAt(path, 0.1), { x: 20, y: 30 });
  assert.deepEqual(traceAt(path, 0.3), { x: 30, y: 40 });
  assert.deepEqual(traceAt(path, 0.9), { x: 40, y: 50 });
  assert.equal(path.at(-1).t, 1);
});
test("separate players replay concurrently and natural routes follow captured bends", () => {
  const play = recorded();
  assert.equal(playSchema.safeParse(play).success, true);
  assert.equal(totalTime(play), 5);
  assert.deepEqual(positionAt(play, "a10", 2), { x: 40, y: 55 });
  assert.deepEqual(positionAt(play, "a10", 3), { x: 40, y: 55 });
  assert.deepEqual(positionAt(play, "a12", 2.5), { x: 60.5, y: 58 });
  assert.deepEqual(positionAt(play, "a10", 8), { x: 60, y: 50 });
});
test("polygon edges preserve loops, endpoints and pauses without cumulative distortion", () => {
  const loop = [
    { x: 20, y: 20, t: 0 },
    { x: 60, y: 20, t: 0.25 },
    { x: 60, y: 60, t: 0.5 },
    { x: 20, y: 60, t: 0.75 },
    { x: 20, y: 20, t: 1 },
  ];
  assert.equal(polygonIndices(loop, 3).length, 4);
  const polygon = tracePoints({
    ...trace,
    points: loop,
    mode: "polygon",
    edges: 3,
  });
  assert.deepEqual(polygon[0], loop[0]);
  assert.deepEqual(polygon.at(-1), loop.at(-1));
  assert.ok(polygon.some((p) => p.x !== 20 || p.y !== 20));
  const one = tracePoints({ ...trace, mode: "polygon", edges: 1 });
  assert.deepEqual(one[2], { ...one[3], t: one[2].t });
  assert.deepEqual(
    tracePoints({ ...trace, mode: "polygon", straighten: 0 }),
    points,
  );
  assert.deepEqual(tracePoints(trace), points);
  assert.deepEqual(points[2], { x: 40, y: 55, t: 0.4 });
});
test("recorded ball has its own timeline and is mirrored with all player paths", () => {
  const play = {
    ...recorded(),
    ballTrace: {
      ...trace,
      points: [
        { x: 33, y: 66, t: 0 },
        { x: 65, y: 44, t: 0.5 },
        { x: 70, y: 40, t: 1 },
      ],
    },
  };
  assert.equal(playSchema.safeParse(play).success, true);
  assert.deepEqual(ballAt(play, 2.5), { x: 65, y: 44 });
  const mirror = mirrorPlay(play);
  for (const t of [0, 0.5, 2.5, 5]) {
    assert.ok(Math.abs(ballAt(mirror, t).x - (100 - ballAt(play, t).x)) < 1e-8);
    assert.ok(
      Math.abs(
        positionAt(mirror, "a10", t).x - (100 - positionAt(play, "a10", t).x),
      ) < 1e-8,
    );
  }
  assert.deepEqual(mirrorPlay(mirror), play);
  assert.equal(setStartingCarrier(play, "a12").ballTrace, undefined);
});
test("route endpoint adjustment uses identical bounded geometry for path and playback", () => {
  const path = anchoredTrace(trace, { x: 4, y: 4 }, { x: 96, y: 96 });
  assert.deepEqual(path[0], { x: 4, y: 4, t: 0 });
  assert.deepEqual(path.at(-1), { x: 96, y: 96, t: 1 });
  assert.ok(path.every((p) => p.x >= 3 && p.x <= 97 && p.y >= 3 && p.y <= 97));
  const play = recorded();
  play.players[0].x = 4;
  play.players[0].y = 4;
  play.movements[0].x = 96;
  play.movements[0].y = 96;
  assert.deepEqual(positionAt(play, "a10", 2), traceAt(path, 0.4));
});
test("recording validation rejects non-monotonic samples, too many points and competing ball passes", () => {
  for (const change of [
    (p) => (p.movements[0].trace.points[1].t = 0),
    (p) => (p.movements[0].trace.points[0].t = 0.1),
    (p) => (p.movements[0].trace.points.at(-1).t = 0.9),
    (p) => (p.movements[0].trace.points[1].x = NaN),
    (p) => (p.movements[0].trace.edges = 0),
    (p) =>
      (p.movements[0].trace.points = Array.from({ length: 605 }, (_, i) => ({
        x: 30,
        y: 40,
        t: i / 604,
      }))),
    (p) => {
      p.ballTrace = trace;
      p.movements.push(
        structuredClone(firstPlay.movements.find((m) => m.kind === "pass")),
      );
    },
  ]) {
    const p = recorded();
    change(p);
    assert.equal(playSchema.safeParse(p).success, false);
  }
});
test("recordings roundtrip backups and retain raw samples in conflict copies", () => {
  const saved = { plays: [recorded()], sessions: [] };
  const draft = structuredClone(saved);
  draft.plays[0].movements[0].trace.edges = 5;
  const restored = notebookSchema.parse(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(restored, saved);
  const recovered = mergeRecovery(saved, draft);
  assert.equal(recovered.plays.length, 2);
  assert.deepEqual(recovered.plays[1].movements[0].trace.points, points);
  assert.equal(notebookSchema.safeParse(recovered).success, true);
});
test("longest capture stays within sample and coordinate limits", () => {
  const samples = Array.from({ length: 600 }, (_, i) => ({
    x: 30 + i / 600,
    y: 50,
    t: i / 20,
  }));
  const p = recorded();
  p.clipDuration = 30;
  p.movements[0].duration = 30;
  p.movements[0].trace.points = finishTrace(samples, 30, 30);
  assert.ok(p.movements[0].trace.points.length <= 604);
  assert.equal(playSchema.safeParse(p).success, true);
});
import {
  recordedSlate,
  notebookBackup,
  notebookSizeError,
  BALL_TAKE,
} from "../lib/touchline/recording.ts";

test("reopening and re-recording a teammate preserve untouched pencil edits and individual line style", () => {
  const play = recorded();
  Object.assign(play.movements[0], { start: 1, duration: 3, x: 80, y: 45 });
  play.movements[0].trace.edges = 9;
  play.movements[0].trace.mode = "polygon";
  const takes = Object.fromEntries(
    play.movements.map((m) => [m.playerId, m.trace.points]),
  );
  takes.a12 = [
    { x: 51, y: 76, t: 0 },
    { x: 65, y: 35, t: 1 },
  ];
  const slate = recordedSlate(
    play,
    takes,
    new Set(["a12"]),
    5,
    { mode: "natural", edges: 2, straighten: 50 },
    false,
  );
  assert.deepEqual(slate.movements[0], play.movements[0]);
  assert.equal(slate.movements[1].x, 65);
  for (const t of [0, 1, 2, 3, 5])
    assert.deepEqual(positionAt(slate, "a10", t), positionAt(play, "a10", t));
  const reshaped = recordedSlate(
    play,
    takes,
    new Set(["a12"]),
    5,
    { mode: "polygon", edges: 2, straighten: 50 },
    true,
  );
  assert.equal(reshaped.movements[0].trace.edges, 2);
  assert.equal(reshaped.movements[0].start, 1);
  assert.equal(reshaped.movements[0].x, 80);
});

test("normalized capture timestamps stay unique even at a near-simultaneous release", () => {
  const samples = [
    { x: 20, y: 30, t: 0 },
    { x: 30, y: 40, t: 1 },
    { x: 31, y: 41, t: 1.00000001 },
  ];
  const result = finishTrace(samples, 1.00000002, 30);
  assert.equal(result.length, 3);
  assert.deepEqual(result[1], { x: 31, y: 41, t: 0.033333 });
  assert.ok(result.every((p, i) => !i || p.t > result[i - 1].t));
});

test("ball recording target is distinct from an imported player whose id is ball", () => {
  assert.notEqual(BALL_TAKE, "ball");
  const play = recorded();
  play.players[0].id = "ball";
  play.ballId = "ball";
  play.movements[0].playerId = "ball";
  const takes = Object.fromEntries(
    play.movements.map((m) => [m.playerId, m.trace.points]),
  );
  const slate = recordedSlate(play, takes, new Set(["ball"]), 5, trace, false);
  assert.equal(slate.movements[0].playerId, "ball");
  assert.equal(playSchema.safeParse(slate).success, true);
});

test("recording size preflight uses the compact, UTF-8 encoded backup that will actually export", () => {
  const data = { plays: [recorded()], sessions: [] };
  assert.equal(notebookSizeError(data), undefined);
  assert.deepEqual(JSON.parse(notebookBackup(data)).data, data);
  data.plays[0].description = "é".repeat(960000);
  assert.ok(notebookSizeError(data));
  assert.ok(
    new TextEncoder().encode(notebookBackup(data)).byteLength > 1900000,
  );
});

test("unrecorded imported IDs that match object properties are not mistaken for takes", () => {
  const play = recorded();
  play.players[0].id = "constructor";
  play.ballId = "constructor";
  play.movements = [];
  const slate = recordedSlate(play, {}, new Set(), 5, trace, false);
  assert.equal(slate.movements.length, 0);
});

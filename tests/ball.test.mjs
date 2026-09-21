import test from "node:test";
import assert from "node:assert/strict";
import {
  firstPlay,
  ballStateAt,
  ballAt,
  ballVisualAt,
  BALL_OFFSET,
  ballActions,
  positionAt,
  mirrorPlay,
  setStartingCarrier,
} from "../lib/touchline/model.ts";
import {
  appendBallAction,
  nearestReceiver,
  assignKickReceiver,
  undoBallAction,
} from "../lib/touchline/ball.ts";
import { recordedSlate, capturePreview } from "../lib/touchline/recording.ts";
import { playSchema } from "../lib/touchline/validation.ts";
const settings = { mode: "natural", edges: 6, straighten: 100 };
const base = () => ({
  ...structuredClone(firstPlay),
  movements: firstPlay.movements.filter((m) => m.kind === "run"),
});

test("launch during live recording uses the performed route instead of teleporting to the old run", () => {
  const play = appendBallAction(base(), "pass", { id: "a12", x: 51, y: 76 }, 1);
  const preview = capturePreview(
    play,
    "a10",
    [
      { x: 30, y: 69, t: 0 },
      { x: 70, y: 40, t: 1 },
    ],
    { x: 72, y: 42 },
    1.2,
    8,
  );
  const launch = ballVisualAt(preview, 1, { a10: { x: 70, y: 40 } });
  assert.ok(Math.abs(launch.x - (70 + BALL_OFFSET.x)) < 0.001);
  assert.ok(Math.abs(launch.y - (40 + BALL_OFFSET.y)) < 0.001);
  assert.notDeepEqual(ballAt(preview, 1), ballAt(play, 1));
});
test("player IDs that match object prototypes never become live positions", () => {
  const play = base();
  play.players[0].id = "constructor";
  play.ballId = "constructor";
  play.movements = [];
  assert.deepEqual(ballVisualAt(play, 0, { a12: { x: 10, y: 20 } }), {
    x: 30 + BALL_OFFSET.x,
    y: 69 + BALL_OFFSET.y,
  });
});

test("held ball follows both animated and currently dragged carrier coordinates", () => {
  const p = base();
  assert.equal(ballStateAt(p, 1).holderId, "a10");
  assert.deepEqual(ballAt(p, 1), positionAt(p, "a10", 1));
  assert.deepEqual(ballVisualAt(p, 1, { a10: { x: 60, y: 30 } }), {
    x: 60 + BALL_OFFSET.x,
    y: 30 + BALL_OFFSET.y,
  });
});
test("pass meets a moving receiver at arrival and stays with that player afterward", () => {
  const p = appendBallAction(base(), "pass", { id: "a12", x: 51, y: 76 }, 0.5);
  assert.equal(playSchema.safeParse(p).success, true);
  assert.equal(ballStateAt(p, 0.7).holderId, undefined);
  assert.deepEqual(ballAt(p, 1.2), positionAt(p, "a12", 1.2));
  assert.deepEqual(ballAt(p, 3), positionAt(p, "a12", 3));
  assert.equal(ballStateAt(p, 3).holderId, "a12");
});
test("pass kick and pass share possession order and do not overlap", () => {
  let p = appendBallAction(base(), "pass", { id: "a12", x: 51, y: 76 }, 1);
  p = appendBallAction(p, "kick", { id: "a14", x: 77, y: 83 }, 0);
  p = appendBallAction(p, "pass", { id: "a10", x: 30, y: 69 }, 0);
  const actions = ballActions(p);
  assert.equal(actions[1].start, actions[0].start + actions[0].duration);
  assert.equal(actions[2].playerId, "a14");
  assert.ok(ballStateAt(p, 2.4).height > 0);
  assert.equal(ballStateAt(p, 5).holderId, "a10");
  assert.equal(playSchema.safeParse(p).success, true);
});
test("space kicks land exactly at the chosen spot and remain loose", () => {
  const p = appendBallAction(base(), "kick", { x: 70, y: 35 }, 1);
  assert.deepEqual(ballVisualAt(p, 4), { x: 70, y: 35 });
  assert.equal(ballStateAt(p, 4).holderId, undefined);
  assert.deepEqual(ballAt(p, 12), { x: 70, y: 35 });
  assert.throws(
    () => appendBallAction(p, "pass", { id: "a12", x: 51, y: 76 }, 5),
    /in space/,
  );
  const caught = assignKickReceiver(p, "a14");
  assert.deepEqual(ballAt(caught, 5), positionAt(caught, "a14", 5));
  assert.equal(playSchema.safeParse(caught).success, true);
});
test("kick diagram and animation use the same quadratic arc", () => {
  const p = appendBallAction(base(), "kick", { x: 70, y: 35 }, 1);
  const start = ballVisualAt(p, 1),
    end = ballVisualAt(p, 2.4),
    mid = ballVisualAt(p, 1.7);
  assert.ok(Math.abs(mid.x - (start.x + end.x) / 2) < 1e-8);
  assert.ok(mid.y < (start.y + end.y) / 2);
  assert.equal(ballStateAt(p, 2.4).height, 0);
  for (const t of [0, 1, 1.7, 2.4, 6])
    assert.ok(
      Math.abs(ballAt(mirrorPlay(p), t).x + ballAt(p, t).x - 100) < 1e-8,
    );
  assert.deepEqual(mirrorPlay(mirrorPlay(p)), p);
});
test("snapping uses displayed player positions and ignores cones and the excluded carrier", () => {
  const p = base();
  p.players.push({ id: "cone", label: "C", team: "cone", x: 60, y: 30 });
  assert.equal(nearestReceiver(p, { x: 60, y: 30 }, 0), undefined);
  const at = positionAt(p, "a14", 5);
  assert.equal(nearestReceiver(p, at, 5)?.id, "a14");
  assert.equal(nearestReceiver(p, at, 5, "a14"), undefined);
});
test("recording one player preserves all untouched routes and ball actions", () => {
  const p = appendBallAction(base(), "kick", { id: "a12", x: 51, y: 76 }, 1);
  const takes = {
    a10: [
      { x: 30, y: 69, t: 0 },
      { x: 50, y: 40, t: 1 },
    ],
  };
  const result = recordedSlate(p, takes, new Set(["a10"]), 8, settings, false);
  assert.deepEqual(
    result.movements.filter((m) => m.playerId === "a14"),
    p.movements.filter((m) => m.playerId === "a14"),
  );
  assert.deepEqual(ballActions(result), ballActions(p));
  assert.equal(playSchema.safeParse(result).success, true);
});
test("legacy ball traces survive untouched drafts and are replaced explicitly by possession actions", () => {
  const p = {
    ...base(),
    clipDuration: 8,
    ballTrace: {
      ...settings,
      points: [
        { x: 30, y: 60, t: 0 },
        { x: 60, y: 50, t: 1 },
      ],
    },
  };
  const kept = recordedSlate(
    p,
    {},
    new Set(),
    8,
    settings,
    false,
    p.ballTrace.points,
  );
  assert.deepEqual(kept.ballTrace, p.ballTrace);
  const reshaped = recordedSlate(
    p,
    {},
    new Set(),
    8,
    { mode: "polygon", edges: 1, straighten: 100 },
    true,
    p.ballTrace.points,
  );
  assert.deepEqual(reshaped.ballTrace, p.ballTrace);
  const changed = appendBallAction(
    kept,
    "pass",
    { id: "a12", x: 51, y: 76 },
    2,
  );
  assert.equal(changed.ballTrace, undefined);
  assert.equal(playSchema.safeParse(changed).success, true);
  assert.deepEqual(ballActions(undoBallAction(changed)), []);
});
test("validation rejects impossible ball chains and carrier reset clears passes and kicks", () => {
  const p = appendBallAction(base(), "kick", { x: 70, y: 35 }, 1);
  const invalid = {
    ...p,
    movements: [
      ...p.movements,
      {
        id: "bad",
        kind: "pass",
        playerId: "a10",
        targetId: "a12",
        x: 51,
        y: 76,
        start: 4,
        duration: 0.7,
      },
    ],
  };
  assert.equal(playSchema.safeParse(invalid).success, false);
  const reset = setStartingCarrier(p, "a12");
  assert.equal(ballActions(reset).length, 0);
  const cone = {
    ...p,
    players: [
      ...p.players,
      { id: "cone", label: "C", team: "cone", x: 50, y: 50 },
    ],
    movements: p.movements.map((m) =>
      m.kind === "kick" ? { ...m, targetId: "cone" } : m,
    ),
  };
  assert.equal(playSchema.safeParse(cone).success, false);
  assert.equal(
    playSchema.safeParse({
      ...p,
      ballTrace: {
        ...settings,
        points: [
          { x: 30, y: 60, t: 0 },
          { x: 60, y: 50, t: 1 },
        ],
      },
      clipDuration: 8,
    }).success,
    false,
  );
});

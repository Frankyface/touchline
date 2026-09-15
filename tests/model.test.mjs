import test from "node:test";
import assert from "node:assert/strict";
import {
  initialData,
  firstPlay,
  positionAt,
  ballAt,
  totalTime,
  restoreRemoved,
} from "../lib/touchline/model.ts";
import { notebookSchema } from "../lib/touchline/validation.ts";

test("all original examples and session references satisfy the saved data contract", () => {
  assert.equal(notebookSchema.safeParse(initialData).success, true);
  assert.equal(initialData.plays.length, 3);
  assert.equal(
    initialData.sessions[0].blocks.reduce((n, b) => n + b.minutes, 0),
    50,
  );
});
test("runs interpolate, stay stationary before their start, and clamp at their endpoint", () => {
  assert.deepEqual(positionAt(firstPlay, "a10", 0), { x: 30, y: 69 });
  assert.deepEqual(positionAt(firstPlay, "a10", 1), { x: 31, y: 60 });
  assert.deepEqual(positionAt(firstPlay, "a10", 50), { x: 32, y: 51 });
  assert.deepEqual(positionAt(firstPlay, "a14", 2.5), { x: 78, y: 68 });
  assert.deepEqual(positionAt(firstPlay, "a14", 6), { x: 84, y: 25 });
});
test("ball starts with carrier, travels through passes, then follows receiver", () => {
  assert.deepEqual(ballAt(firstPlay, 0), positionAt(firstPlay, "a10", 0));
  assert.deepEqual(ballAt(firstPlay, 2.2), positionAt(firstPlay, "a12", 2.2));
  assert.deepEqual(ballAt(firstPlay, 6), positionAt(firstPlay, "a14", 6));
  const midpoint = ballAt(firstPlay, 1.8);
  assert.ok(midpoint.x > 31 && midpoint.x < 52);
  assert.equal(totalTime(firstPlay), 6);
});
test("multi-leg loop remains continuous and reaches each authored point", () => {
  const loop = initialData.plays[2];
  assert.deepEqual(positionAt(loop, "a10", 2.6), { x: 45, y: 85 });
  assert.deepEqual(positionAt(loop, "a10", 3.6), { x: 67, y: 82 });
  assert.deepEqual(positionAt(loop, "a10", 4.6), { x: 70, y: 69 });
  assert.deepEqual(ballAt(loop, 10), { x: 88, y: 26 });
});
test("invalid backups reject missing references, duplicate IDs, NaN, and overlapping routes", () => {
  for (const change of [
    (d) => d.plays[0].players.splice(0, 1),
    (d) => d.plays.push(d.plays[0]),
    (d) => (d.plays[0].players[0].x = NaN),
    (d) => (d.sessions[0].blocks[0].playId = "missing"),
    (d) =>
      d.plays[0].movements.push({
        ...d.plays[0].movements[0],
        id: "overlap",
        start: 1,
      }),
    (d) =>
      (d.plays[0].movements.find((m) => m.kind === "pass").playerId = "a14"),
  ]) {
    const data = structuredClone(initialData);
    change(data);
    assert.equal(notebookSchema.safeParse(data).success, false);
  }
});
test("empty notebooks and a new blank play are valid, while blank required names are drafts", () => {
  assert.equal(
    notebookSchema.safeParse({ plays: [], sessions: [] }).success,
    true,
  );
  const data = structuredClone(initialData);
  data.plays[0].title = "";
  assert.equal(notebookSchema.safeParse(data).success, false);
});
test("delete undo restores only that record and its links, preserving intervening edits", () => {
  const before = structuredClone(initialData);
  const current = structuredClone(before);
  current.plays.shift();
  current.plays[0].title = "An intervening edit";
  current.sessions[0].blocks[1].playId = undefined;
  current.sessions[0].blocks[1].notes = "New coaching note";
  const restored = restoreRemoved(current, before, "play", "wide-door");
  assert.equal(restored.plays.length, 3);
  assert.equal(restored.plays[1].title, "An intervening edit");
  assert.equal(restored.sessions[0].blocks[1].notes, "New coaching note");
  assert.equal(restored.sessions[0].blocks[1].playId, "wide-door");
  assert.equal(notebookSchema.safeParse(restored).success, true);
  assert.equal(
    restoreRemoved(restored, before, "play", "wide-door").plays.length,
    3,
  );
});

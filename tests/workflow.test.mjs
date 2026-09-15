import test from "node:test";
import assert from "node:assert/strict";
import {
  initialData,
  firstPlay,
  ballAt,
  positionAt,
  mirrorPlay,
  setStartingCarrier,
  blockFromPlay,
  repeatSession,
  equipmentList,
  restoreBlock,
  mergeRecovery,
} from "../lib/touchline/model.ts";
import { starters, createFromStarter } from "../lib/touchline/templates.ts";
import { notebookSchema, playSchema } from "../lib/touchline/validation.ts";
import {
  secondsRemaining,
  pauseClock,
  toggleClock,
  extendClock,
  formatClock,
} from "../lib/touchline/timer.ts";

test("each starter creates independent valid editable geometry for existing notebooks", () => {
  for (const starter of starters) {
    const a = createFromStarter(starter),
      b = createFromStarter(starter, "My variation");
    assert.notEqual(a.id, b.id);
    assert.equal(b.title, "My variation");
    assert.ok(playSchema.safeParse(a).success);
    assert.ok(
      notebookSchema.safeParse({
        ...initialData,
        plays: [...initialData.plays, a, b],
      }).success,
    );
    if (a.players[0]) {
      a.players[0].x = 5;
      assert.notEqual(b.players[0].x, 5);
    }
  }
});
test("mirror preserves possession and reflects animation at intermediate times", () => {
  const mirrored = mirrorPlay(firstPlay);
  assert.deepEqual(mirrorPlay(mirrored), firstPlay);
  assert.equal(mirrored.ballId, firstPlay.ballId);
  for (const t of [0, 0.5, 1.8, 2.5, 4, 6]) {
    for (const p of firstPlay.players) {
      const a = positionAt(firstPlay, p.id, t),
        b = positionAt(mirrored, p.id, t);
      assert.ok(Math.abs(a.x + b.x - 100) < 0.000001);
      assert.equal(a.y, b.y);
    }
    assert.ok(
      Math.abs(ballAt(firstPlay, t).x + ballAt(mirrored, t).x - 100) < 0.000001,
    );
  }
  assert.ok(playSchema.safeParse(mirrored).success);
});
test("selecting the active starting carrier never destroys its passes", () => {
  assert.equal(setStartingCarrier(firstPlay, firstPlay.ballId), firstPlay);
  assert.equal(setStartingCarrier(firstPlay, "unknown"), firstPlay);
  const changed = setStartingCarrier(firstPlay, "a14");
  assert.equal(changed.ballId, "a14");
  assert.ok(changed.movements.every((m) => m.kind === "run"));
  assert.ok(playSchema.safeParse(changed).success);
});
test("timing edits reject overlapping runs and broken pass chronology", () => {
  const play = structuredClone(initialData.plays[2]);
  play.movements.find((m) => m.id === "r5").start = 2;
  assert.ok(!playSchema.safeParse(play).success);
  const passEdit = structuredClone(firstPlay);
  passEdit.movements.find((m) => m.id === "p1").duration = 3;
  assert.ok(!playSchema.safeParse(passEdit).success);
  const valid = structuredClone(firstPlay);
  valid.movements[0].duration = 1.4;
  assert.ok(playSchema.safeParse(valid).success);
});
test("session reuse carries coaching knowledge but clears delivery history", () => {
  const play = {
    ...firstPlay,
    setup: "3 v 2 in a channel",
    equipment: "1 ball · 6 cones",
    easier: "Walk through",
    challenge: "Vary the defender",
  };
  const block = blockFromPlay(play);
  assert.equal(block.notes, play.cues);
  assert.equal(block.easier, play.easier);
  const session = {
    ...initialData.sessions[0],
    completedAt: "2026-09-15T10:00:00.000Z",
    date: "2026-09-15",
    focus: "Find width",
    review: {
      worked: "Earlier support",
      nextTime: "Revisit the inside option",
    },
    blocks: [block],
  };
  const copy = repeatSession(session);
  assert.equal(copy.date, "");
  assert.equal(copy.completedAt, undefined);
  assert.equal(copy.review, undefined);
  assert.equal(copy.carriedForward, session.review.nextTime);
  assert.equal(copy.focus, session.focus);
  assert.notEqual(copy.id, session.id);
  assert.notEqual(copy.blocks[0].id, block.id);
  assert.ok(
    notebookSchema.safeParse({ ...initialData, sessions: [session, copy] })
      .success,
  );
});
test("equipment list deduplicates wording without inventing combined quantities", () => {
  const session = {
    ...initialData.sessions[0],
    blocks: [
      { ...initialData.sessions[0].blocks[0], equipment: "1 ball · 6 cones" },
      { ...initialData.sessions[0].blocks[1], equipment: "1 Ball; 8 cones" },
    ],
  };
  assert.deepEqual(equipmentList(session), ["1 ball", "6 cones", "8 cones"]);
});
test("block undo keeps subsequent edits and does not duplicate the restored block", () => {
  const before = initialData.sessions[0],
    removed = before.blocks[1];
  const current = {
    ...before,
    title: "Edited after removal",
    blocks: before.blocks.filter((b) => b.id !== removed.id),
  };
  const result = restoreBlock(current, removed, 1);
  assert.equal(result.title, current.title);
  assert.equal(result.blocks[1].id, removed.id);
  assert.equal(restoreBlock(result, removed, 1), result);
});
test("recovery preserves server edits and copies divergent local work with valid links", () => {
  const server = structuredClone(initialData),
    draft = structuredClone(initialData);
  server.plays[0].title = "Server version";
  draft.plays[0].title = "Local version";
  const result = mergeRecovery(server, draft);
  assert.equal(result.plays.length, 4);
  assert.equal(result.plays[0].title, "Server version");
  assert.equal(result.plays[3].title, "Local version (recovered)");
  assert.equal(result.sessions.length, 2);
  assert.equal(result.sessions[1].blocks[1].playId, result.plays[3].id);
  assert.equal(draft.plays[0].title, "Local version");
  assert.equal(server.plays.length, 3);
  assert.ok(notebookSchema.safeParse(result).success);
  assert.deepEqual(mergeRecovery(initialData, initialData), initialData);
});
test("recovery is insensitive to object key order and remains idempotent after saving", () => {
  const draft=notebookSchema.parse(structuredClone(initialData));
  draft.plays[0].setup="An appended optional field";
  draft.sessions[0].focus="A new focus";
  const stored=notebookSchema.parse(draft);
  assert.deepEqual(mergeRecovery(stored,draft),stored);
  draft.plays[0].title="A real change";
  const recovered=mergeRecovery(stored,draft);
  const savedAgain=notebookSchema.parse(recovered);
  assert.deepEqual(mergeRecovery(savedAgain,recovered),savedAgain);
  const retried=mergeRecovery(stored,recovered);
  assert.deepEqual(retried,recovered);
});
test("fractional route timing and boundary coordinates remain valid for movement editing", () => {
  const play=structuredClone(firstPlay);
  play.movements[0]={...play.movements[0],start:1.25,duration:.35,x:43.527812,y:3};
  assert.ok(playSchema.safeParse(play).success);
  play.movements[0].y=97;
  assert.ok(playSchema.safeParse(play).success);
});
test("wall-clock timer survives delayed ticks, pauses, extension and deliberate overtime", () => {
  const running = toggleClock({ remaining: 60, deadline: null }, 1000);
  assert.equal(secondsRemaining(running, 31500), 30);
  assert.equal(secondsRemaining(running, 71000), -10);
  const extended = extendClock(running, 60);
  assert.equal(secondsRemaining(extended, 71000), 50);
  const paused = pauseClock(extended, 71000);
  assert.equal(secondsRemaining(paused, 9999999), 50);
  assert.equal(secondsRemaining(toggleClock(paused, 100000), 105000), 45);
  assert.equal(formatClock(-61), "+01:01");
  assert.equal(formatClock(0), "00:00");
});
test("legacy data and new optional fields survive strict validation without migration", () => {
  const data = structuredClone(initialData);
  assert.ok(notebookSchema.safeParse(data).success);
  data.plays[0].favorite = true;
  data.plays[0].easier = "More space";
  data.sessions[0].focus = "See support";
  data.sessions[0].success = "Receiver stays available";
  data.sessions[0].review = {
    worked: "Clear communication",
    nextTime: "Change the starting picture",
  };
  assert.deepEqual(notebookSchema.parse(data), data);
  data.sessions[0].review.nextTime = "x".repeat(2001);
  assert.ok(!notebookSchema.safeParse(data).success);
});

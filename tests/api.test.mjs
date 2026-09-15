import assert from "node:assert/strict";
import { mergeRecovery } from "../lib/touchline/model.ts";
const base = process.env.TOUCHLINE_TEST_URL ?? "http://localhost:5178";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base))
  throw new Error("Integration test is restricted to a local preview.");
const login = await fetch(base + "/signin-with-chatgpt?return_to=/", {
  redirect: "manual",
});
const cookie = login.headers
  .getSetCookie()
  .map((s) => s.split(";")[0])
  .join("; ");
assert.ok(cookie, "Local preview auth cookie");
const headers = {
  Cookie: cookie,
  "Content-Type": "application/json",
  Origin: base,
};
const read = async () => {
  const r = await fetch(base + "/api/notebook", {
    headers: { Cookie: cookie },
  });
  assert.equal(r.status, 200);
  return r.json();
};
const original = await read();
let revision = original.revision;
const put = async (data, rev = revision, extra = {}) =>
  fetch(base + "/api/notebook", {
    method: "PUT",
    headers: { ...headers, ...extra },
    body: JSON.stringify({ revision: rev, data }),
  });
try {
  const unauthorized = await fetch(base + "/api/notebook");
  assert.equal(unauthorized.status, 401);
  const invalid = structuredClone(original.data);
  invalid.plays[0].players[0].x = 900;
  assert.equal((await put(invalid)).status, 400);
  assert.equal(
    (
      await put(original.data, revision, {
        Origin: "https://untrusted.invalid",
      })
    ).status,
    403,
  );
  const changed = structuredClone(original.data);
  changed.plays[0].description += " [API verification]";
  changed.plays[0].favorite = true;
  changed.plays[0].setup = "Three players in a channel";
  changed.sessions[0].focus = "Find the extra player";
  changed.sessions[0].review = {
    worked: "Earlier communication",
    nextTime: "Revisit the support angle",
  };
  const response = await put(changed);
  assert.equal(response.status, 200);
  revision = (await response.json()).revision;
  assert.equal(
    (await read()).data.plays[0].description,
    changed.plays[0].description,
  );
  assert.equal((await put(original.data, revision - 1)).status, 409);
  assert.equal((await read()).revision, revision);
  assert.deepEqual(
    (await read()).data.sessions[0].review,
    changed.sessions[0].review,
  );
  const draft = structuredClone(changed);
  draft.plays[0].title = "Local recovery check";
  const merged = mergeRecovery((await read()).data, draft);
  const recovered = await put(merged);
  assert.equal(recovered.status, 200);
  revision = (await recovered.json()).revision;
  const persisted = (await read()).data;
  assert.equal(persisted.plays.length, changed.plays.length + 1);
  assert.equal(persisted.plays[0].title, changed.plays[0].title);
  assert.equal(
    persisted.plays.at(-1).title,
    "Local recovery check (recovered)",
  );
  assert.equal(
    persisted.sessions
      .at(-1)
      .blocks.find((b) => b.playId === persisted.plays.at(-1).id)?.playId,
    persisted.plays.at(-1).id,
  );
  console.log(
    "PASS: authentication, validation, origin, new fields, durable roundtrip, stale-write rejection, and recovery copies.",
  );
} finally {
  const restore = await put(original.data);
  assert.equal(restore.status, 200, "Restore the original local notebook");
  console.log("Restored original local notebook.");
}

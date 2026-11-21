import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import test from "node:test";

const { createPixelTestSession } = await import("./meta-pixel-session.ts");
const { createPrivacyChoice } = await import("../privacy/policy.ts");

function fixture(overrides = {}) {
  const c = {
    sandbox: true,
    authorizedTest: true,
    metadataReviewed: true,
    role: "professional",
    origin: "http://127.0.0.1:3150",
    pathname: "/app/profissional/assinatura/pagamento",
    search: "",
    hash: "",
    consent: JSON.stringify(createPrivacyChoice(true, 1, true)),
    ...overrides,
  };
  const commands = [];
  let loads = 0;
  const session = createPixelTestSession({
    context: () => c,
    now: () => 2,
    load: async () => {
      loads++;
      return (command) => commands.push(command);
    },
  });
  return { c, commands, session, loads: () => loads };
}
const event = { eventName: "InitiateCheckout", eventId: "a".repeat(64), actionConfirmed: true };

test("no SDK access outside explicitly consented, reviewed local professional test", async () => {
  for (const change of [
    { sandbox: false },
    { authorizedTest: false },
    { metadataReviewed: false },
    { role: "patient" },
    { origin: "https://lectum.com.br" },
    { origin: "http://localhost.evil" },
    { pathname: "/comunidades" },
    { search: "?email=private" },
    { hash: "#private" },
    { consent: null },
    { consent: JSON.stringify(createPrivacyChoice(false, 1)) },
    { consent: JSON.stringify(createPrivacyChoice(true, 1, false)) },
  ]) {
    const f = fixture(change);
    assert.equal((await f.session.send(event)).state, "blocked");
    assert.equal(f.loads(), 0);
  }
});
test("single initialization and no concurrent duplicate or automatic PageView", async () => {
  const f = fixture();
  const results = await Promise.all([f.session.send(event), f.session.send(event)]);
  assert.deepEqual(
    results.map((r) => r.state),
    ["dispatched", "duplicate"],
  );
  assert.equal(f.loads(), 1);
  assert.deepEqual(
    f.commands.map((c) => c[0]),
    ["consent", "set", "init", "trackSingle"],
  );
  assert.deepEqual(f.commands[3][3], {});
});
test("unconfirmed actions, Subscribe and invalid identity never load SDK", async () => {
  for (const change of [
    { actionConfirmed: false },
    { eventName: "Subscribe" },
    { eventId: "invalid" },
  ]) {
    const f = fixture();
    assert.equal((await f.session.send({ ...event, ...change })).state, "blocked");
    assert.equal(f.loads(), 0);
  }
});
test("revocation while SDK loads prevents initialization and event", async () => {
  const f = fixture();
  const commands = [];
  let release;
  const session = createPixelTestSession({
    context: () => f.c,
    now: () => 2,
    load: () =>
      new Promise((resolve) => {
        release = () => resolve((c) => commands.push(c));
      }),
  });
  const pending = session.send(event);
  f.c.consent = null;
  release();
  assert.equal((await pending).state, "blocked");
  assert.ok(commands.every((c) => c[0] === "consent" && c[1] === "revoke"));
});
test("SDK failure stays unknown and is never retried", async () => {
  const f = fixture();
  let calls = 0;
  const session = createPixelTestSession({
    context: () => f.c,
    now: () => 2,
    load: async () => {
      calls++;
      throw new Error("private provider detail");
    },
  });
  assert.equal((await session.send(event)).state, "unknown");
  assert.equal((await session.send(event)).state, "blocked");
  assert.equal(calls, 1);
});

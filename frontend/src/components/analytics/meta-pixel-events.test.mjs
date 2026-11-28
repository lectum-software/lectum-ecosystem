import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import test from "node:test";

const { pixelCommand, pixelLocationAllowed } = await import("./meta-pixel-events.ts");
const pixelId = "1606598847399888";
const eventId = "a".repeat(64);
test("all existing event names preserve server identity and strip unrelated data", () => {
  for (const eventName of [
    "CompleteRegistration",
    "Contact",
    "forum_post",
    "InitiateCheckout",
    "Subscribe",
  ]) {
    const command = pixelCommand(pixelId, {
      eventId,
      eventName,
      params: {
        account_type: "user",
        value: 34.9,
        currency: "BRL",
        post_body: "never transmit",
      },
    });
    assert.ok(command);
    assert.equal(command[0], eventName === "forum_post" ? "trackSingleCustom" : "trackSingle");
    assert.deepEqual(command[4], { eventID: eventId });
    assert.ok(!JSON.stringify(command).includes("never transmit"));
  }
  assert.equal(pixelCommand(pixelId, { eventId, eventName: "Subscribe", params: {} }), null);
  assert.equal(
    pixelCommand(pixelId, { eventId: "invalid", eventName: "Contact", params: {} }),
    null,
  );
});
test("only approved routes and campaign parameters can load Pixel", () => {
  for (const path of [
    "/",
    "/app",
    "/psicologos",
    "/comunidades",
    "/comunidades/ansiedade-em-equilibrio",
    "/app/profissional/assinatura/pagamento",
  ]) {
    assert.equal(pixelLocationAllowed(`https://www.lectum.com.br${path}?utm_source=meta`), true);
  }
  for (const path of [
    "/app/perfil",
    "/app/conta",
    "/publicacoes/private-id",
    "/?token=secret",
    "/?email=person",
    "/#secret",
  ]) {
    assert.equal(pixelLocationAllowed(`https://www.lectum.com.br${path}`), false);
  }
  assert.equal(pixelLocationAllowed("https://evil.example/comunidades/ansiedade"), false);
  assert.equal(pixelLocationAllowed("http://localhost:3150/"), false);
});
test("SDK awaits consent, deduplicates concurrent sends, and revokes", async () => {
  const commands = [];
  let script;
  globalThis.window = {};
  globalThis.document = {
    createElement: () => ({ remove() {} }),
    head: {
      appendChild(node) {
        script = node;
      },
    },
  };
  const storage = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value),
  };
  const { sendPixelReceipt, revokeProductionPixel } = await import("./meta-pixel-runtime.ts");
  const receipt = { eventId, eventName: "forum_post", params: {} };
  await sendPixelReceipt(pixelId, receipt, () => false);
  assert.equal(script, undefined);
  let allowed = true;
  const pending = sendPixelReceipt(pixelId, receipt, () => allowed);
  assert.ok(script);
  allowed = false;
  const fbq = window.fbq;
  commands.push(...fbq.queue);
  fbq.callMethod = (...args) => commands.push(args);
  script.onload();
  await pending;
  assert.equal(commands.filter((x) => x[0] === "trackSingleCustom").length, 0);
  allowed = true;
  await Promise.all([
    sendPixelReceipt(pixelId, receipt, () => allowed),
    sendPixelReceipt(pixelId, receipt, () => allowed),
  ]);
  assert.equal(commands.filter((x) => x[0] === "trackSingleCustom").length, 1);
  assert.deepEqual(
    commands.find((x) => x[0] === "init"),
    ["init", pixelId],
  );
  assert.ok(commands.some((x) => x[0] === "set" && x[1] === "autoConfig" && x[2] === false));
  revokeProductionPixel();
  assert.deepEqual(commands.at(-1), ["consent", "revoke"]);
});

test("Pixel requires a fresh explicit choice and fails closed on storage errors", async () => {
  const values = new Map();
  window.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  window.dispatchEvent = () => true;
  const { persistPixelChoice, readPixelChoice, pixelConsentStart } = await import(
    "./meta-pixel-choice.ts"
  );
  assert.equal(readPixelChoice(), null);
  assert.equal(pixelConsentStart(), null);
  assert.equal(persistPixelChoice(true), true);
  assert.equal(readPixelChoice(), "granted");
  assert.ok(pixelConsentStart() <= Date.now());
  const key = "lectum.meta-pixel-consent.v1";
  const value = JSON.parse(values.get(key));
  values.set(key, JSON.stringify({ ...value, expiresAt: Date.now() - 1 }));
  assert.equal(readPixelChoice(), null);
  persistPixelChoice(false);
  assert.equal(readPixelChoice(), "denied");
  window.localStorage.setItem = () => {
    throw new Error("blocked");
  };
  assert.equal(persistPixelChoice(true), false);
  assert.equal(readPixelChoice(), "denied");
});

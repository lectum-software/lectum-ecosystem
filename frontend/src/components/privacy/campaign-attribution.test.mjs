import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("./campaign-attribution.ts", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const {
  BrowserAttribution,
  ATTRIBUTION_STORAGE_KEY,
  PRE_SIGNUP_RETENTION_MS,
  permittedBrowserCampaigns,
} = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);

function fixture(overrides = {}) {
  const rows = new Map();
  let clock = 100_000;
  const choice = {
    version: "test",
    campaigns: true,
    savedAt: clock,
    expiresAt: clock + 90 * 86_400_000,
  };
  const calls = [];
  const storage = {
    getItem: (key) => rows.get(key) ?? null,
    setItem: (key, value) => rows.set(key, value),
    removeItem: (key) => rows.delete(key),
  };
  const options = {
    enabled: true,
    version: "test",
    storage: () => storage,
    now: () => clock,
    newToken: () => "a".repeat(64),
    transport: {
      capture: async (input) => {
        calls.push(input);
        return {
          enabled: true,
          expires_at: new Date(100_000 + PRE_SIGNUP_RETENTION_MS).toISOString(),
        };
      },
      revoke: async (token) => {
        calls.push({ revoke: token });
      },
    },
    ...overrides,
  };
  return {
    client: new BrowserAttribution(options),
    options,
    rows,
    choice,
    calls,
    storage,
    advance: (ms) => {
      clock += ms;
    },
  };
}
const campaigns = { utm_source: "meta", utm_campaign: "campaign_a" };

test("disabled collection gate does not read storage, create identity or call transport", async () => {
  const f = fixture({
    enabled: false,
    storage: () => {
      throw new Error("must not read");
    },
  });
  await f.client.capture(f.choice, campaigns);
  await f.client.revoke();
  assert.equal(f.client.tokenForTransfer(f.choice), null);
  assert.deepEqual(f.calls, []);
});
test("only approved campaign values are read; click IDs and arbitrary clinical text are excluded", () => {
  assert.deepEqual(
    permittedBrowserCampaigns("?utm_source=meta&utm_campaign=unapproved&fbclid=x&email=x", {
      utm_source: ["meta"],
    }),
    { utm_source: "meta" },
  );
});
test("new session retains token at day 7, direct visit does not replace it; day 30 expires", async () => {
  const f = fixture();
  await f.client.capture(f.choice, campaigns);
  const token = f.client.tokenForTransfer(f.choice);
  f.advance(7 * 86_400_000);
  const reopened = new BrowserAttribution(f.options);
  await reopened.capture(f.choice, {});
  assert.equal(reopened.tokenForTransfer(f.choice), token);
  assert.equal(f.calls.length, 1);
  f.advance(23 * 86_400_000);
  assert.equal(reopened.tokenForTransfer(f.choice), null);
  assert.equal(f.rows.size, 0);
});
test("refusal, missing and expired consent do not create an identity", async () => {
  for (const choice of [
    null,
    { version: "test", campaigns: false },
    { version: "test", campaigns: true, savedAt: 0, expiresAt: 1 },
  ]) {
    const f = fixture();
    await f.client.capture(choice, campaigns);
    assert.equal(f.rows.size, 0);
    assert.deepEqual(f.calls, []);
  }
});
test("pending revocation survives a reload and cannot be transferred or collected", async () => {
  const f = fixture();
  await f.client.capture(f.choice, campaigns);
  f.options.transport.revoke = async () => {
    throw new Error("offline");
  };
  await f.client.revoke();
  assert.equal(JSON.parse(f.rows.get(ATTRIBUTION_STORAGE_KEY)).pendingRevocation, true);
  const reopened = new BrowserAttribution(f.options);
  assert.equal(reopened.tokenForTransfer(f.choice), null);
  await reopened.capture(f.choice, campaigns);
  assert.equal(f.calls.length, 1);
  f.options.transport.revoke = async () => {};
  await reopened.revoke();
  assert.equal(f.rows.size, 0);
});
test("capture response after revocation cannot resurrect attribution", async () => {
  let finish;
  const f = fixture();
  f.options.transport.capture = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const pending = f.client.capture(f.choice, campaigns);
  await f.client.revoke();
  finish({ enabled: true, expires_at: new Date(100_000 + PRE_SIGNUP_RETENTION_MS).toISOString() });
  await pending;
  assert.equal(f.rows.size, 0);
  assert.equal(f.client.tokenForTransfer(f.choice), null);
});
test("successful account transfer prevents token reuse without revoking the account on a late capture response", async () => {
  let finish;
  const f = fixture();
  f.options.transport.capture = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const pending = f.client.capture(f.choice, campaigns);
  f.client.markTransferred();
  finish({ enabled: true, expires_at: new Date(100_000 + PRE_SIGNUP_RETENTION_MS).toISOString() });
  await pending;
  assert.equal(f.client.tokenForTransfer(f.choice), null);
  assert.equal(f.calls.length, 0);
  await f.client.capture(f.choice, campaigns);
  assert.equal(f.calls.length, 0);
});
test("storage failure prevents capture; consent withdrawn while waiting is rechecked", async () => {
  const f = fixture({
    storage: () => ({
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
    }),
  });
  await f.client.capture(f.choice, campaigns);
  assert.deepEqual(f.calls, []);
  const revoked = fixture({ currentChoice: () => null });
  await revoked.client.capture(revoked.choice, campaigns);
  assert.deepEqual(revoked.calls, []);
});

test("explicit consent can transfer on direct visits without inventing campaign data", async () => {
  const f = fixture();
  await f.client.capture(null, {});
  assert.equal(f.calls.length, 0);
  f.advance(1);
  f.choice.savedAt += 1;
  await f.client.capture(f.choice, {});
  assert.equal(f.calls.length, 1);
  assert.deepEqual(f.calls[0].campaigns, {});
  assert.equal(f.client.tokenForTransfer(f.choice), "a".repeat(64));
  await f.client.revoke();
  assert.equal(f.client.tokenForTransfer(f.choice), null);
});

test("direct visit retries failed persistence with the same consent token", async () => {
  let attempts = 0;
  const tokens = [];
  const f = fixture({
    transport: {
      capture: async (input) => {
        tokens.push(input.token);
        if (++attempts === 1) throw new Error("offline");
        return {
          enabled: true,
          expires_at: new Date(100_000 + PRE_SIGNUP_RETENTION_MS).toISOString(),
        };
      },
      revoke: async () => {},
    },
  });
  await f.client.capture(f.choice, {});
  await f.client.capture(f.choice, {});
  await f.client.capture(f.choice, {});
  assert.equal(attempts, 2);
  assert.equal(tokens[0], tokens[1]);
});
test("measurement requires confirmed capture and ignores account association choice", async () => {
  const f = fixture();
  const choice = { ...f.choice, authorizeTransfer: false };
  assert.equal(f.client.tokenForMeasurement(choice), null);
  await f.client.capture(choice, {});
  assert.equal(f.client.tokenForMeasurement(choice), "a".repeat(64));
  assert.equal(f.client.tokenForMeasurement({ ...choice, campaigns: false }), null);
  assert.equal(f.client.tokenForMeasurement({ ...choice, pendingRevocation: true }), null);
  f.client.markTransferred();
  assert.equal(f.client.tokenForMeasurement(choice), null);
});

test("pending capture cannot authorize a click and revocation defeats completion", async () => {
  let complete;
  const f = fixture({
    transport: {
      capture: () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
      revoke: async () => {},
    },
  });
  const capture = f.client.capture(f.choice, {});
  assert.equal(f.client.tokenForMeasurement(f.choice), null);
  await f.client.revoke();
  complete({
    enabled: true,
    expires_at: new Date(100_000 + PRE_SIGNUP_RETENTION_MS).toISOString(),
  });
  await capture;
  assert.equal(f.client.tokenForMeasurement(f.choice), null);
});

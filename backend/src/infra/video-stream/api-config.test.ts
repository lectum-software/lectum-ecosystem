import assert from "node:assert/strict";
import { test } from "node:test";
import { getVideoStreamApiConfig, getVideoStreamConfig } from "./config";

const env = {
  NODE_ENV: "test",
  CLOUDFLARE_STREAM_ENABLED: "true",
  CLOUDFLARE_STREAM_ACCOUNT_ID: "test-account",
  CLOUDFLARE_STREAM_API_TOKEN: "test-token",
};

test("caption API configuration does not enable playback or uploads without signing configuration", () => {
  assert.deepEqual(getVideoStreamApiConfig(env), {
    accountId: "test-account",
    apiToken: "test-token",
    requestTimeoutMs: 15_000,
  });
  assert.equal(getVideoStreamConfig(env), null);
});

test("API configuration still requires enablement and valid credentials", () => {
  assert.equal(getVideoStreamApiConfig({ ...env, CLOUDFLARE_STREAM_ENABLED: "false" }), null);
  assert.equal(getVideoStreamApiConfig({ ...env, CLOUDFLARE_STREAM_ACCOUNT_ID: "../other" }), null);
  assert.equal(getVideoStreamApiConfig({ ...env, CLOUDFLARE_STREAM_API_TOKEN: " " }), null);
});

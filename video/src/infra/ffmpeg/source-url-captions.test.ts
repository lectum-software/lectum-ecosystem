import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRemoteVideoSourceUrl } from "./source-url.js";

test("public Stream proof is limited to one loopback development allowlist", () => {
  const keys = ["NODE_ENV", "HOST", "VIDEO_CAPTIONS_LOCAL_PUBLIC_URL"] as const;
  const before = keys.map((key) => process.env[key]);
  const url = `https://customer-test.cloudflarestream.com/${"a".repeat(32)}/manifest/video.m3u8`;
  try {
    Object.assign(process.env, {
      NODE_ENV: "development",
      HOST: "127.0.0.1",
      VIDEO_CAPTIONS_LOCAL_PUBLIC_URL: url,
    });
    assert.ok(parseRemoteVideoSourceUrl(url));
    assert.equal(parseRemoteVideoSourceUrl(url.replace("customer-test", "customer-other")), null);
    process.env.NODE_ENV = "production";
    assert.equal(parseRemoteVideoSourceUrl(url), null);
    process.env.NODE_ENV = "development";
    process.env.HOST = "0.0.0.0";
    assert.equal(parseRemoteVideoSourceUrl(url), null);
    process.env.HOST = "127.0.0.1";
    process.env.VIDEO_CAPTIONS_LOCAL_PUBLIC_URL = "https://127.0.0.1/manifest/video.m3u8";
    assert.equal(parseRemoteVideoSourceUrl(process.env.VIDEO_CAPTIONS_LOCAL_PUBLIC_URL), null);
  } finally {
    keys.forEach((key, index) => {
      if (before[index] === undefined) delete process.env[key];
      else process.env[key] = before[index];
    });
  }
});

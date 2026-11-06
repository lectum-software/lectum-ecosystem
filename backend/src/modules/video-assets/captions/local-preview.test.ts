import assert from "node:assert/strict";
import test from "node:test";
import { localCaptionPreviewPlayback } from "./local-preview";

test("public caption preview is restricted to the explicitly enabled local video", () => {
  const asset = { id: "local-caption-asset", provider_uid: "a".repeat(32) };
  const env = {
    NODE_ENV: "development",
    BASE: "http://127.0.0.1:4134",
    VIDEO_CAPTIONS_ASSET_IDS: asset.id,
    VIDEO_CAPTIONS_LOCAL_PUBLIC_UID: asset.provider_uid,
    VIDEO_CAPTIONS_LOCAL_PUBLIC_CUSTOMER: "customer-example",
  };
  assert.ok(localCaptionPreviewPlayback(asset, env));
  for (const override of [
    { NODE_ENV: "production" },
    { BASE: "https://api.lectum.com.br" },
    { VIDEO_CAPTIONS_ASSET_IDS: "" },
    { VIDEO_CAPTIONS_LOCAL_PUBLIC_UID: "b".repeat(32) },
    { VIDEO_CAPTIONS_LOCAL_PUBLIC_CUSTOMER: "customer-example/other" },
  ])
    assert.equal(localCaptionPreviewPlayback(asset, { ...env, ...override }), null);
});

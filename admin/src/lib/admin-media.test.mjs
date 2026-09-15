import assert from "node:assert/strict";
import test from "node:test";
import {
  isAdminVideoAssetReference,
  videoAssetIdFromAdminReference,
} from "./admin-video-stream-reference.ts";

test("aceita somente referência interna estável de vídeo no Admin", () => {
  const reference = "/api/private/video-assets/asset_12345678/playback";

  assert.equal(videoAssetIdFromAdminReference(reference), "asset_12345678");
  assert.equal(
    videoAssetIdFromAdminReference(`https://homolog-api.lectum.com.br${reference}`),
    "asset_12345678",
  );
  assert.equal(isAdminVideoAssetReference(`${reference}?token=secret`), false);
  assert.equal(isAdminVideoAssetReference("https://attacker.example/video.mp4"), false);
});

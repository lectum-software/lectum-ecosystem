import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const readSource = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("diagnostico privado do artefato social separa falhas sem PII", () => {
  const diagnosticsSource = readSource("./lectum-share-media/diagnostics.ts");
  const sentryPolicySource = readSource("./sentry-policy.ts");
  const mediaSource = readSource("./lectum-share-media.ts");
  const mediabunnySource = readSource("./lectum-share-media/mediabunny-export.ts");
  const hookSource = readSource("../hooks/use-lectum-direct-share.ts");

  for (const expected of [
    "reportLectumShareExportFailure",
    "Sentry.withScope",
    "scope.setTag",
    "captureException",
    "lectum.stage",
    "lectum.previous_stage",
    "lectum.runtime",
    "lectum.browser",
    "lectum.webcodecs",
    "HTMLCanvasElement",
    "MediaRecorder",
    "VideoEncoder",
  ]) {
    assert.match(diagnosticsSource, new RegExp(expected.replaceAll(".", "\\.")), expected);
  }

  for (const forbidden of ["postId", "replyId", "mediaUrl", "shareUrl", "professional"]) {
    assert.equal(diagnosticsSource.includes(forbidden), false, forbidden);
  }

  for (const stage of [
    "source-fetch",
    "source-empty",
    "canvas-context",
    "mediabunny-import",
    "mediabunny-can-encode",
    "mediabunny-conversion-init",
    "mediabunny-conversion-invalid",
    "mediabunny-conversion-execute",
    "mediabunny-output-empty",
  ]) {
    assert.match(mediabunnySource, new RegExp(stage), stage);
  }

  assert.match(mediaSource, /previousStage: mediabunnyFailureStage/);
  assert.match(mediaSource, /toLectumShareDiagnosticError\(error, "legacy-export"/);
  assert.match(hookSource, /reportLectumShareExportFailure\(\{ destination, error, target \}\)/);
  assert.match(hookSource, /Não foi possível preparar o vídeo com arte agora\. Tente novamente\./);
  assert.match(sentryPolicySource, /SAFE_SENTRY_TAG_KEYS/);
  assert.match(sentryPolicySource, /sanitizeSentryTags/);
  assert.match(sentryPolicySource, /"lectum\.stage"/);
});

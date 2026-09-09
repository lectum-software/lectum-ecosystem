import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isNativeShareAbortError,
  resolveLectumFileShareData,
  resolveLectumLinkShareData,
} from "./lectum-share-media/native-share.ts";

test("compartilhamento de link usa payload nativo somente quando suportado", () => {
  const shareData = {
    text: "Leia na Lectum",
    title: "Post na Lectum",
    url: "https://lectum.com.br/comunidades/feed/publicacao/post-1",
  };
  const nav = {
    canShare: (data) => data === shareData,
    share: async () => undefined,
  };

  assert.equal(resolveLectumLinkShareData(nav, shareData), shareData);
  assert.equal(resolveLectumLinkShareData({ canShare: () => true }, shareData), null);
});

test("compartilhamento de arquivo usa payload nativo somente quando suportado", () => {
  const shareData = {
    files: [{}],
    text: "Vídeo social Lectum",
    title: "Vídeo na Lectum",
  };
  const nav = {
    canShare: (data) => data === shareData,
    share: async () => undefined,
  };

  assert.equal(resolveLectumFileShareData(nav, shareData), shareData);
  assert.equal(resolveLectumFileShareData({ canShare: () => true }, shareData), null);
  assert.equal(resolveLectumFileShareData({ ...nav }, { ...shareData, files: [] }), null);
});

test("cancelamento nativo permanece silencioso", () => {
  assert.equal(isNativeShareAbortError({ name: "AbortError" }), true);
  assert.equal(isNativeShareAbortError({ name: "NotAllowedError" }), false);
});

test("vídeos sociais usam render server-side sem MediaBunny no frontend", () => {
  const targetSource = readFileSync(new URL("./lectum-share-target.ts", import.meta.url), "utf8");
  const mediaSource = readFileSync(new URL("./lectum-share-media.ts", import.meta.url), "utf8");
  const hookSource = readFileSync(
    new URL("../hooks/use-lectum-direct-share.ts", import.meta.url),
    "utf8",
  );
  const dialogHookSource = readFileSync(
    new URL("../hooks/use-lectum-share-download-dialog.tsx", import.meta.url),
    "utf8",
  );
  const dialogSource = readFileSync(
    new URL("../components/community/lectum-share-download-dialog.tsx", import.meta.url),
    "utf8",
  );
  const wakeLockSource = readFileSync(new URL("./screen-wake-lock.ts", import.meta.url), "utf8");
  const packageSource = readFileSync(new URL("../../package.json", import.meta.url), "utf8");

  assert.match(targetSource, /createLectumShareVideoTarget[\s\S]*createLectumShareLinkTarget/);
  assert.match(targetSource, /createLectumSharePostMediaTarget[\s\S]*createLectumShareLinkTarget/);
  assert.match(targetSource, /LectumShareSocialTarget/);
  assert.match(targetSource, /createLectumShareVideoDownloadTarget/);
  assert.match(targetSource, /cardLabel:\s*"Postado na Lectum"/);
  assert.match(targetSource, /const cardLabel = "Respondido na Lectum"/);
  assert.doesNotMatch(targetSource, /cardLabel:\s*"Perguntaram na Lectum"/);
  assert.match(mediaSource, /startPostShareVideoArtifactRenderJob/);
  assert.match(mediaSource, /downloadPostShareVideoArtifactRenderJobFile/);
  assert.match(mediaSource, /retryTransientShareRenderRequest/);
  assert.match(mediaSource, /LectumShareRenderError/);
  assert.match(mediaSource, /diagnostic/);
  assert.match(mediaSource, /createShareRenderRequestError/);
  assert.match(mediaSource, /isRetryableApiError/);
  assert.match(mediaSource, /SERVER_SHARE_RENDER_TRANSIENT_RETRY_DELAYS_MS/);
  assert.match(mediaSource, /SERVER_SHARE_RENDER_JOB_CACHE_TTL_MS/);
  assert.match(mediaSource, /preparedShareRenderJobCache/);
  assert.match(mediaSource, /900_000/);
  assert.match(mediaSource, /resolveLectumFileShareData/);
  assert.match(mediaSource, /userActivation/);
  assert.match(mediaSource, /mode:\s*"prepared"/);
  assert.match(mediaSource, /shouldAvoidBrowserFilePreviewFallback/);
  assert.match(hookSource, /prepareLectumShareFileWithServerRender/);
  assert.match(hookSource, /buildLectumShareRenderDiagnosticDescription/);
  assert.match(hookSource, /SHARE_RENDER_DIAGNOSTIC_COPY/);
  assert.match(hookSource, /description: diagnosticDescription/);
  assert.match(hookSource, /requestLectumScreenWakeLock/);
  assert.match(hookSource, /result\.mode === "prepared"/);
  assert.match(dialogHookSource, /preparePendingTarget/);
  assert.match(dialogHookSource, /autoPreparedTargetRef/);
  assert.match(dialogHookSource, /preparedFile/);
  assert.match(dialogHookSource, /requestLectumScreenWakeLock/);
  assert.match(dialogSource, /preparedPreviewUrl/);
  assert.match(dialogSource, /A prévia final aparece aqui/);
  assert.match(dialogSource, /fit="cover"/);
  assert.doesNotMatch(dialogSource, /fit="contain"/);
  assert.doesNotMatch(dialogSource, /target\.cardLabel/);
  assert.match(wakeLockSource, /wakeLock\?\.request\("screen"\)/);
  const removedRuntimePattern = new RegExp(
    [["media", "bunny"].join(""), ["playwright", "core"].join("-")].join("|"),
    "i",
  );
  assert.doesNotMatch(targetSource, removedRuntimePattern);
  assert.doesNotMatch(mediaSource, removedRuntimePattern);
  assert.doesNotMatch(hookSource, removedRuntimePattern);
  assert.doesNotMatch(dialogSource, removedRuntimePattern);
  assert.doesNotMatch(wakeLockSource, removedRuntimePattern);
  assert.doesNotMatch(packageSource, removedRuntimePattern);
});

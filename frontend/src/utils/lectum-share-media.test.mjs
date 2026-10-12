import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import "../../scripts/register-source-modules.mjs";
import {
  isNativeShareAbortError,
  resolveLectumFileShareData,
  resolveLectumLinkShareData,
} from "./lectum-share-media/native-share.ts";
import { getPreviewSourceBodyHeight, wrapPreviewSourceText } from "./lectum-share-preview-text.ts";

const { createLectumShareVideoDownloadTarget, shouldHideReplyQuestion } = await import(
  "./lectum-share-target.ts"
);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/image") {
      const imageModule = nextResolve("next/dist/client/image-component.js", context).url;
      return {
        shortCircuit: true,
        url: `data:text/javascript,${encodeURIComponent(`export { Image as default } from ${JSON.stringify(imageModule)}`)}`,
      };
    }
    return nextResolve(specifier, context);
  },
});
const { LectumSharePreviewArt } = await import(
  "../components/community/lectum-share-download-dialog.tsx"
);

test("previa renderizada remove toda a pergunta e mantem identificacao sem aviso substituto", () => {
  const target = {
    sourceText: "Pergunta original",
    cardLabel: "Respondido na Lectum",
    professional: { name: "Ana", roleLabel: "Psicóloga", verified: true },
  };
  const visible = renderToStaticMarkup(createElement(LectumSharePreviewArt, { target }));
  assert.match(visible, /Pergunta original/);
  assert.match(visible, /Respondido na Lectum/);
  const hidden = renderToStaticMarkup(
    createElement(LectumSharePreviewArt, { target: { ...target, hideSourceCard: true } }),
  );
  assert.doesNotMatch(
    hidden,
    /Pergunta original|Respondido na Lectum|lectum-symbol-white|data-lectum-share-preview-source-text/,
  );
  assert.match(hidden, /Ana/);
  assert.match(hidden, /Psicóloga/);
});

test("video sem texto no comentario pai nao ganha caixinha nem titulo substituto", () => {
  const post = { id: "post-1", title: "Pergunta original" };
  const reply = {
    id: "reply-2",
    parent_reply_id: "reply-1",
    parent_content: null,
    media_type: "video",
    media_url: "/video.mp4",
    content: "",
    title: null,
    author: {
      role: "psicologo",
      name: "Ana",
      verified: true,
      type_label: "Psicóloga",
      avatar: null,
    },
  };
  for (const parent_content of [null, "", "  \n  "]) {
    const item = { ...reply, parent_content };
    assert.equal(shouldHideReplyQuestion(item), true);
    assert.equal(createLectumShareVideoDownloadTarget(post, item).hideSourceCard, true);
  }
  const direct = { ...reply, parent_reply_id: null };
  assert.equal(shouldHideReplyQuestion(direct), false);
  const directTarget = createLectumShareVideoDownloadTarget(post, direct);
  assert.equal(directTarget.hideSourceCard, false);
  assert.equal(directTarget.sourceText, post.title);
  const textTarget = createLectumShareVideoDownloadTarget(post, {
    ...reply,
    parent_content: "Minha duvida",
  });
  assert.equal(textTarget.hideSourceCard, false);
  assert.equal(textTarget.sourceText, "Minha duvida");
  const resolved = createLectumShareVideoDownloadTarget(post, reply, {
    parentContent: "Texto carregado",
  });
  assert.equal(resolved.hideSourceCard, false);
  assert.equal(resolved.sourceText, "Texto carregado");
});

test("exibicao, previa e cache respeitam a ausencia da caixinha", () => {
  const dialog = readFileSync(
    new URL("../components/community/lectum-share-download-dialog.tsx", import.meta.url),
    "utf8",
  );
  const card = readFileSync(
    new URL("../components/community/community-post-card.tsx", import.meta.url),
    "utf8",
  );
  const media = readFileSync(new URL("./lectum-share-media.ts", import.meta.url), "utf8");
  assert.match(dialog, /!target\.hideSourceCard \? \(/);
  assert.match(card, /ProfileReplyVideoQuestion title=\{post.title\} reply=\{primaryReply\}/);
  assert.match(media, /target\.hideSourceCard === true/);
  assert.match(media, /target\.professional\.verified/);
  assert.doesNotMatch(dialog, /Respondendo (?:a )?outro v[ií]deo/i);
});

test("previa preserva a pergunta completa e cresce somente depois de tres linhas", () => {
  const question =
    "Como lidar com a ansiedade quando ela atrapalha o trabalho, os relacionamentos e os momentos de descanso?";
  const lines = wrapPreviewSourceText(question, 30);
  assert.deepEqual(lines, [
    "Como lidar com a ansiedade",
    "quando ela atrapalha o",
    "trabalho, os relacionamentos e",
    "os momentos de descanso?",
  ]);
  assert.equal(lines.join(" "), question);
  assert.equal(getPreviewSourceBodyHeight(lines.length), "16.975cqh");
  for (const lineCount of [1, 2, 3]) {
    assert.equal(getPreviewSourceBodyHeight(lineCount), "13.85cqh");
  }
});

test("previa preserva palavras longas, acentos e todo o limite de texto social", () => {
  const longWord = "a".repeat(65);
  assert.deepEqual(wrapPreviewSourceText(longWord, 30), ["a".repeat(30), "a".repeat(30), "aaaaa"]);
  const question = "Como lidar com a ansiedade? ".repeat(7).trim().slice(0, 180);
  const lines = wrapPreviewSourceText(question, 30);
  assert.equal(lines.join(" "), question);
  assert.ok(lines.length > 3);
  assert.ok(lines.every((line) => line.length <= 30));
  assert.equal(
    wrapPreviewSourceText("  Como\n lidar com emo\u00e7\u00f5es?  ", 30).join(" "),
    "Como lidar com emo\u00e7\u00f5es?",
  );
  assert.deepEqual(wrapPreviewSourceText(" \n ", 30), ["Conte\u00fado na Lectum"]);
});

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
  assert.match(mediaSource, /16_000/);
  assert.match(mediaSource, /45_000/);
  assert.match(mediaSource, /getShareRenderTransientRetryDelay/);
  assert.match(mediaSource, /SERVER_SHARE_RENDER_TRANSIENT_RETRY_MIN_DELAY_MS/);
  assert.match(mediaSource, /SERVER_SHARE_RENDER_START_RETRY_TIMEOUT_MS = 240_000/);
  assert.match(mediaSource, /SERVER_SHARE_RENDER_JOB_QUEUE_STALL_TIMEOUT_MS = 120_000/);
  assert.match(mediaSource, /isQueuedShareRenderJobStalled/);
  assert.match(
    mediaSource,
    /Math\.min\(attempt,\s*SERVER_SHARE_RENDER_TRANSIENT_RETRY_DELAYS_MS\.length - 1\)/,
  );
  assert.match(mediaSource, /SERVER_SHARE_RENDER_JOB_START_TIMEOUT_MS = 180_000/);
  assert.match(mediaSource, /SERVER_SHARE_RENDER_JOB_CACHE_TTL_MS/);
  assert.match(mediaSource, /preparedShareRenderJobCache/);
  assert.match(mediaSource, /900_000/);
  assert.match(mediaSource, /resolveLectumFileShareData/);
  assert.match(mediaSource, /downloadFile\(file\)/);
  assert.doesNotMatch(mediaSource, /mode:\s*"prepared"/);
  assert.doesNotMatch(mediaSource, /userActivation/);
  assert.doesNotMatch(mediaSource, /shouldAvoidBrowserFilePreviewFallback/);
  assert.match(hookSource, /prepareLectumShareFileWithServerRender/);
  assert.match(hookSource, /isLectumShareRenderAbortError/);
  assert.match(hookSource, /buildLectumShareRenderDiagnosticDescription/);
  assert.match(hookSource, /SHARE_RENDER_DIAGNOSTIC_COPY/);
  assert.match(hookSource, /description: diagnosticDescription/);
  assert.match(hookSource, /requestLectumScreenWakeLock/);
  assert.doesNotMatch(hookSource, /result\.mode === "prepared"/);
  assert.doesNotMatch(hookSource, /Toque novamente em Baixar/);
  assert.match(hookSource, /Mantenha esta tela aberta enquanto o vídeo é preparado\./);
  assert.match(
    dialogHookSource,
    /shareLectumTarget\(pendingTarget,[\s\S]*destination: "download"[\s\S]*signal: controller\.signal/,
  );
  assert.match(dialogHookSource, /downloadAbortControllerRef/);
  assert.match(dialogHookSource, /downloadAbortControllerRef\.current\?\.abort\(\)/);
  assert.doesNotMatch(dialogHookSource, /preparePendingTarget/);
  assert.doesNotMatch(dialogHookSource, /autoPreparedTargetRef/);
  assert.doesNotMatch(dialogHookSource, /preparedFile/);
  assert.doesNotMatch(dialogHookSource, /prepareLectumShareFileWithServerRender/);
  assert.doesNotMatch(dialogHookSource, /requestLectumScreenWakeLock/);
  assert.doesNotMatch(dialogHookSource, /toast\.loading/);
  assert.match(dialogSource, /const resolvedMediaUrl = target\.mediaUrl/);
  assert.match(dialogSource, /createPortal\(/);
  assert.match(dialogSource, /document\.body/);
  assert.match(dialogSource, /isolate z-\[1000\]/);
  assert.match(dialogSource, /data-lectum-share-preview-art/);
  assert.match(dialogSource, /data-lectum-share-preview-volume-button/);
  assert.match(dialogSource, /absolute right-3 bottom-3 z-\[3\]/);
  assert.match(dialogSource, /bg-transparent text-primary-foreground\/85/);
  assert.match(dialogSource, /next\/image/);
  assert.match(dialogSource, /\/images\/social\/lectum-symbol-white\.png/);
  assert.match(dialogSource, /-translate-y-\[0\.35cqw\]/);
  assert.match(dialogSource, /VerifiedBadgeIcon/);
  assert.match(dialogSource, /top-\[13%\] left-\[10\.2%\] w-\[79\.7%\]/);
  assert.match(dialogSource, /rounded-\[2\.95cqw\]/);
  assert.doesNotMatch(dialogSource, /w-\[79\.7%\][^"]*drop-shadow-lg/);
  assert.match(dialogSource, /bg-primary/);
  assert.match(dialogSource, /h-\[4\.6cqh\]/);
  assert.match(dialogSource, /height: getPreviewSourceBodyHeight\(sourceLines\.length\)/);
  assert.doesNotMatch(dialogSource, /line-clamp-3/);
  assert.match(dialogSource, /px-\[6\.6cqw\]/);
  assert.match(dialogSource, /font-bold/);
  assert.match(dialogSource, /text-\[4\.65cqw\]/);
  assert.match(
    dialogSource,
    /sourceLines\.length > 2\s*\?\s*"text-\[4\.05cqw\] leading-\[1\.17\]"/,
  );
  assert.match(dialogSource, /top-\[69\.35%\]/);
  assert.match(dialogSource, /gap-\[0\.93cqw\]/);
  assert.match(dialogSource, /text-\[2\.95cqw\]/);
  assert.match(dialogSource, /mt-\[0\.55cqw\]/);
  assert.match(dialogSource, /text-\[1\.8cqw\]/);
  assert.match(dialogSource, /h-\[2\.05cqw\] w-\[2\.22cqw\]/);
  assert.doesNotMatch(dialogSource, /bg-background\/85/);
  assert.doesNotMatch(dialogSource, /border-border\/70/);
  assert.match(
    dialogSource,
    /const downloadButtonLabel = preparing \? "Preparando\.\.\." : "Baixar v\\u00eddeo"/,
  );
  assert.match(dialogSource, /disabled=\{!open\}/);
  assert.match(dialogSource, /wrapPreviewSourceText\(sourceText, 30\)/);
  assert.match(dialogSource, /target\.cardLabel/);
  assert.match(dialogSource, /target\.sourceText/);
  assert.match(dialogSource, /poster=\{target\.posterUrl \?\? undefined\}/);
  assert.match(dialogSource, /fit="contain"/);
  assert.doesNotMatch(dialogSource, /fit="cover"/);
  assert.doesNotMatch(dialogSource, /preparedPreviewUrl/);
  assert.doesNotMatch(dialogSource, /URL\.createObjectURL/);
  assert.doesNotMatch(dialogSource, /Preparar v\\u00eddeo/);
  assert.doesNotMatch(dialogSource, /Som ligado|Som desligado/);
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

test("video-resposta usa o comentario pai na previa e no render social", () => {
  const targetSource = readFileSync(new URL("./lectum-share-target.ts", import.meta.url), "utf8");
  const replyCardSource = readFileSync(
    new URL("../app/app/community/[slug]/post/[id]/components/reply-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    targetSource,
    /options\.parentContent \?\? \("parent_content" in reply \? reply\.parent_content : null\)/,
  );
  assert.match(replyCardSource, /parentContent:\s*reply\.parent_content/);
});

test("previa aplica a mesma truncagem explicita do nome no MP4", () => {
  const dialog = readFileSync(
    new URL("../components/community/lectum-share-download-dialog.tsx", import.meta.url),
    "utf8",
  );
  const target = readFileSync(new URL("./lectum-share-target.ts", import.meta.url), "utf8");
  assert.match(dialog, /\{truncateLectumShareProfessionalTagName\(target\.professional\.name\)\}/);
  assert.doesNotMatch(dialog, /\{target\.professional\.name\}/);
  assert.match(target, /LECTUM_SHARE_PROFESSIONAL_TAG_NAME_MAX_LENGTH = 30/);
  assert.match(dialog, /min-h-2 min-w-2 shrink-0/);
});

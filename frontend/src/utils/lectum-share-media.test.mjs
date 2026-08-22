import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const {
  isNativeShareAbortError,
  isNativeShareActivationError,
  resolveLectumFileShareData,
  resolveLectumLinkShareData,
} = await import("./lectum-share-media/native-share.ts");
const {
  resolveVideoExportDurationSeconds,
  resolveVideoExportSafetyTimeoutMs,
  resolveVideoExportStallTimeoutMs,
} = await import("./lectum-share-media/duration.ts");
const { safeFileName, shareFileTitle } = await import("./lectum-share-media/file-name.ts");

const createShareFile = () =>
  new File(["lectum"], "lectum-respondido-vertical-9x16.mp4", {
    type: "video/mp4",
  });

test("compartilhamento de arquivo usa payload completo quando suportado", () => {
  const file = createShareFile();
  const fullShareData = {
    files: [file],
    text: "Legenda Lectum",
    title: "Respondido na Lectum",
  };
  const nav = {
    canShare: (data) => data === fullShareData,
    share: async () => undefined,
  };

  assert.equal(resolveLectumFileShareData(nav, fullShareData), fullShareData);
});

test("compartilhamento de arquivo cai para files-only quando texto/titulo nao sao aceitos", () => {
  const file = createShareFile();
  const checkedPayloads = [];
  const nav = {
    canShare: (data) => {
      checkedPayloads.push(data);
      return Boolean(data.files?.length) && !data.text && !data.title;
    },
    share: async () => undefined,
  };

  const result = resolveLectumFileShareData(nav, {
    files: [file],
    text: "Legenda Lectum",
    title: "Respondido na Lectum",
  });

  assert.deepEqual(result, { files: [file] });
  assert.equal(checkedPayloads.length, 2);
});

test("compartilhamento de arquivo fica indisponivel sem share nativo", () => {
  assert.equal(
    resolveLectumFileShareData(
      { canShare: () => true },
      {
        files: [createShareFile()],
        text: "Legenda Lectum",
        title: "Respondido na Lectum",
      },
    ),
    null,
  );
});

test("compartilhamento de link usa payload nativo quando suportado", () => {
  const shareData = {
    text: "Leia na Lectum",
    title: "Post na Lectum",
    url: "https://lectum.com.br/app/comunidades/feed/publicacao/post-1",
  };
  const nav = {
    canShare: (data) => data === shareData,
    share: async () => undefined,
  };

  assert.equal(resolveLectumLinkShareData(nav, shareData), shareData);
});

test("compartilhamento de link fica indisponivel sem share nativo", () => {
  assert.equal(
    resolveLectumLinkShareData(
      { canShare: () => true },
      {
        text: "Leia na Lectum",
        title: "Post na Lectum",
        url: "https://lectum.com.br/app/comunidades/feed/publicacao/post-1",
      },
    ),
    null,
  );
});

test("videos compartilhados priorizam arquivo social e mantem link publico como fallback", () => {
  const targetSource = readFileSync(new URL("./lectum-share-target.ts", import.meta.url), "utf8");
  const mediaSource = readFileSync(new URL("./lectum-share-media.ts", import.meta.url), "utf8");
  const hookSource = readFileSync(
    new URL("../hooks/use-lectum-direct-share.ts", import.meta.url),
    "utf8",
  );
  const postsRequestSource = readFileSync(
    new URL("../api/req/posts/index.ts", import.meta.url),
    "utf8",
  );
  const seoSource = readFileSync(
    new URL(
      "../../../backend/src/modules/api/public/seo/community-post/use-cases/services.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const repositorySource = readFileSync(
    new URL(
      "../../../backend/src/modules/api/private/posts/repositories/queries/PostShareArtifactRepository.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    targetSource,
    /publicCommunityReplyThreadHref\(post\.community\.slug, post\.id, reply\.id\)/,
  );
  assert.match(targetSource, /shareText: postTitle/);
  assert.match(mediaSource, /shareLectumSocialLinkPreviewTarget/);
  assert.match(mediaSource, /text: null/);
  assert.match(mediaSource, /url: target\.shareUrl/);
  assert.match(mediaSource, /files: \[file\][\s\S]*url: target\.shareUrl/);
  assert.match(
    hookSource,
    /shareSocialFileTarget\(target\)[\s\S]*shareLectumSocialLinkPreviewTarget\(target\)/,
  );
  assert.doesNotMatch(
    hookSource,
    /target\.mediaType === "video"[\s\S]*shareLectumSocialLinkPreviewTarget\(target\)[\s\S]*shareSocialFileTarget\(target\)/,
  );
  assert.match(seoSource, /professionalVideoTitle/);
  assert.match(seoSource, /resolveVideoOpenGraphDescription/);
  assert.match(seoSource, /\$\{name\} na Lectum/);
  assert.match(postsRequestSource, /SHARE_ARTIFACT_UPLOAD_TIMEOUT_MS = 300_000/);
  assert.match(repositorySource, /lectum-share-v5-2026-08-22-file-first-complete-video/);
});

test("cancelamento nativo da share sheet e reconhecido sem virar erro tecnico", () => {
  assert.equal(isNativeShareAbortError(new DOMException("Cancelado", "AbortError")), true);
  assert.equal(isNativeShareAbortError(new DOMException("Bloqueado", "NotAllowedError")), false);
});

test("perda de ativacao nativa e reconhecida sem acionar download automatico", () => {
  assert.equal(
    isNativeShareActivationError(new DOMException("Bloqueado", "NotAllowedError")),
    true,
  );
  assert.equal(isNativeShareActivationError(new DOMException("Bloqueado", "SecurityError")), true);
  assert.equal(isNativeShareActivationError(new DOMException("Cancelado", "AbortError")), false);
});

test("nome do arquivo compartilhavel usa profissional e contexto", () => {
  const target = {
    cardLabel: "Respondido na Lectum",
    kind: "video_response",
    professional: { name: "Ana Rubia Papi" },
  };

  assert.equal(shareFileTitle(target), "Ana Rubia Papi - Respondido na Lectum");
  assert.equal(safeFileName(target, "mp4"), "Ana Rubia Papi - Respondido na Lectum.mp4");
  assert.equal(
    safeFileName(
      {
        ...target,
        cardLabel: "Postado na Lectum",
        kind: "post_media",
      },
      "mp4",
    ),
    "Ana Rubia Papi - Postado na Lectum.mp4",
  );
  assert.equal(
    safeFileName(
      {
        ...target,
        professional: { name: "Dra. A/B:C* Psicologa" },
      },
      "mp4",
    ),
    "Dra. ABC Psicologa - Respondido na Lectum.mp4",
  );
});

test("exportacao de video preserva audio sem conectar saida audivel", () => {
  const source = readFileSync(new URL("./lectum-share-media/export.ts", import.meta.url), "utf8");

  assert.match(source, /createMediaElementSource\(video\)/);
  assert.match(source, /createMediaStreamDestination\(\)/);
  assert.match(source, /source\.connect\(destination\)/);
  assert.match(source, /stream\.addTrack\(track\)/);
  assert.doesNotMatch(source, /audioContext\.destination/);
});

test("exportacao de video usa a duracao real em vez de limitar a um minuto", () => {
  assert.equal(resolveVideoExportDurationSeconds(127), 127);
  assert.equal(resolveVideoExportDurationSeconds(60.5), 60.5);
  assert.equal(resolveVideoExportDurationSeconds(Number.NaN), 15);
  assert.equal(resolveVideoExportSafetyTimeoutMs(15, false), 600_000);
  assert.equal(resolveVideoExportSafetyTimeoutMs(127, true), 441_000);
  assert.equal(resolveVideoExportStallTimeoutMs(), 45_000);

  const source = readFileSync(new URL("./lectum-share-media/export.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /MAX_VIDEO_EXPORT_SECONDS/);
  assert.match(source, /recorder\.requestData\(\)/);
  assert.match(source, /lastProgressAt/);
  assert.match(source, /stalled/);
});

test("layout social usa card parecido com instagram e respeita safe area de reels", () => {
  const layoutSource = readFileSync(
    new URL("./lectum-share-media/layout.ts", import.meta.url),
    "utf8",
  );
  const exportSource = readFileSync(
    new URL("./lectum-share-media/export.ts", import.meta.url),
    "utf8",
  );
  const repositorySource = readFileSync(
    new URL(
      "../../../backend/src/modules/api/private/posts/repositories/queries/PostShareArtifactRepository.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(layoutSource, /const brandLogoSrc = "\/logo-icon\.svg"/);
  assert.match(layoutSource, /brandLogoWhite/);
  assert.match(layoutSource, /globalCompositeOperation = "source-in"/);
  assert.match(layoutSource, /ctx\.drawImage\(\s*assets\.brandLogoWhite/);
  assert.doesNotMatch(layoutSource, /arc\(iconBoxX/);
  assert.match(layoutSource, /paddingX: 50/);
  assert.match(layoutSource, /width: 860/);
  assert.match(layoutSource, /x: 110/);
  assert.match(layoutSource, /y: 250/);
  assert.match(layoutSource, /bodyFontSize: 48/);
  assert.match(layoutSource, /headerFontSize: 36/);
  assert.match(layoutSource, /minBodyHeight: 268/);
  assert.match(layoutSource, /maxQuestionLines: 3/);
  assert.match(layoutSource, /nameFontSize: 34/);
  assert.match(layoutSource, /roleGap: 16/);
  assert.match(layoutSource, /ctx\.fillText\(roleLabel, nameStartX, roleY\)/);
  assert.doesNotMatch(layoutSource, /ctx\.fillText\(roleLabel, layout\.width \/ 2, roleY\)/);
  assert.match(exportSource, /loadShareCanvasAssets/);
  assert.match(repositorySource, /lectum-share-v5-2026-08-22-file-first-complete-video/);
});

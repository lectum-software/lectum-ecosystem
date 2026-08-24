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
    title: "Ana Rubia na Lectum",
  };
  const nav = {
    canShare: (data) => data === fullShareData,
    share: async () => undefined,
  };

  assert.equal(resolveLectumFileShareData(nav, fullShareData), fullShareData);
});

test("compartilhamento de arquivo cai para files-only quando titulo nao e aceito", () => {
  const file = createShareFile();
  const checkedPayloads = [];
  const nav = {
    canShare: (data) => {
      checkedPayloads.push(data);
      return Boolean(data.files?.length) && !data.title;
    },
    share: async () => undefined,
  };

  const result = resolveLectumFileShareData(nav, {
    files: [file],
    title: "Ana Rubia na Lectum",
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
        title: "Ana Rubia na Lectum",
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

test("videos compartilhados separam link de whatsapp e arquivo social sem link", () => {
  const targetSource = readFileSync(new URL("./lectum-share-target.ts", import.meta.url), "utf8");
  const mediaSource = readFileSync(new URL("./lectum-share-media.ts", import.meta.url), "utf8");
  const hookSource = readFileSync(
    new URL("../hooks/use-lectum-direct-share.ts", import.meta.url),
    "utf8",
  );
  const artifactCacheSource = readFileSync(
    new URL("./lectum-share-artifact-cache.ts", import.meta.url),
    "utf8",
  );
  const shareDialogHookSource = readFileSync(
    new URL("../hooks/use-lectum-share-dialog.tsx", import.meta.url),
    "utf8",
  );
  const shareDialogSource = readFileSync(
    new URL("../components/community/lectum-share-destination-dialog.tsx", import.meta.url),
    "utf8",
  );
  const instagramIconSource = readFileSync(
    new URL("../components/ui/instagram-icon.tsx", import.meta.url),
    "utf8",
  );
  const publicRoutesSource = readFileSync(new URL("./public-routes.ts", import.meta.url), "utf8");
  const seoMetadataSource = readFileSync(
    new URL("../lib/seo-metadata.ts", import.meta.url),
    "utf8",
  );
  const postWhatsappPageSource = readFileSync(
    new URL("../app/comunidades/[slug]/publicacao/[id]/whatsapp/page.tsx", import.meta.url),
    "utf8",
  );
  const replyWhatsappPageSource = readFileSync(
    new URL(
      "../app/comunidades/[slug]/publicacao/[id]/resposta/[replyId]/whatsapp/page.tsx",
      import.meta.url,
    ),
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
  const mediaActionsSource = readFileSync(
    new URL(
      "../../../backend/src/modules/api/private/posts/use-cases/services/media-actions.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const createPostControllerSource = readFileSync(
    new URL(
      "../app/app/community/[slug]/post/new/hooks/use-create-community-post-controller.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const postDetailControllerSource = readFileSync(
    new URL(
      "../app/app/community/[slug]/post/[id]/views/post-detail-controller.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const replyThreadSource = readFileSync(
    new URL("../app/app/community/[slug]/post/[id]/views/reply-thread.tsx", import.meta.url),
    "utf8",
  );
  const postEditSource = readFileSync(
    new URL("../components/community/post-edit-modal.tsx", import.meta.url),
    "utf8",
  );
  const preparedShareSource = mediaSource.slice(
    mediaSource.indexOf("export const sharePreparedLectumVideoResponse"),
    mediaSource.indexOf("export const downloadPreparedLectumShareFile"),
  );
  const copyTargetSource = mediaSource.slice(
    mediaSource.indexOf("export const copyLectumShareTargetUrl"),
    mediaSource.indexOf("export const sharePreparedLectumVideoResponse"),
  );
  const shareArtifactUploadTypeSource = postsRequestSource.slice(
    postsRequestSource.indexOf("const withShareArtifactFileType"),
    postsRequestSource.indexOf("export const getPostShareArtifact"),
  );

  assert.match(
    targetSource,
    /publicCommunityReplyThreadHref\(post\.community\.slug, post\.id, reply\.id\)/,
  );
  assert.match(targetSource, /shareText: postTitle/);
  assert.match(targetSource, /whatsappShareUrl/);
  assert.match(
    targetSource,
    /publicCommunityPostWhatsappShareHref\(post\.community\.slug, post\.id\)/,
  );
  assert.match(
    targetSource,
    /publicCommunityReplyWhatsappShareHref\(post\.community\.slug, post\.id, reply\.id\)/,
  );
  assert.match(publicRoutesSource, /publicCommunityPostWhatsappShareHref/);
  assert.match(publicRoutesSource, /publicCommunityReplyWhatsappShareHref/);
  assert.match(mediaSource, /shareLectumSocialLinkPreviewTarget/);
  assert.match(mediaSource, /shareLectumWhatsAppPreviewTarget/);
  assert.match(mediaSource, /https:\/\/wa\.me\/\?text=/);
  assert.match(mediaSource, /copyLectumShareTargetUrl/);
  assert.match(mediaSource, /return copyLectumShareTargetUrl\(target\)/);
  assert.match(copyTargetSource, /copyShareUrl\(target\.shareUrl\)/);
  assert.doesNotMatch(copyTargetSource, /copyLectumShareTargetUrl\(target\)/);
  assert.match(mediaSource, /text: null/);
  assert.match(
    mediaSource,
    /shareUrl: options\.whatsappPreview \? target\.whatsappShareUrl : target\.shareUrl/,
  );
  assert.match(preparedShareSource, /files: \[file\][\s\S]*title: target\.shareTitle/);
  assert.doesNotMatch(preparedShareSource, /url: target\.shareUrl/);
  assert.doesNotMatch(preparedShareSource, /text: target\.shareText/);
  assert.doesNotMatch(preparedShareSource, /copyShareUrl\(target\.shareUrl\)/);
  assert.match(hookSource, /destination === "copy_link"[\s\S]*copyLectumShareTargetUrl\(target\)/);
  assert.match(
    hookSource,
    /destination === "whatsapp"[\s\S]*shareLectumWhatsAppPreviewTarget\(target\)/,
  );
  assert.match(
    hookSource,
    /prepareSocialFileTarget\(target\)[\s\S]*sharePreparedLectumVideoResponse\(target, file/,
  );
  assert.match(hookSource, /getLectumShareArtifactFile\(socialTarget\)/);
  assert.match(
    hookSource,
    /destination === "social"[\s\S]*prepareLectumSourceVideoFallbackFile\(socialTarget\)/,
  );
  assert.match(
    hookSource,
    /!isLectumSourceVideoFallbackFile\(file\)[\s\S]*persistLectumShareArtifact\(socialTarget, file\)/,
  );
  assert.match(hookSource, /persistLectumShareArtifact\(socialTarget, file\)/);
  assert.match(
    hookSource,
    /if \(result\.mode !== "prepared"\) \{[\s\S]*trackShare\(target, result\.channel\)/,
  );
  assert.match(
    hookSource,
    /destination === "download"[\s\S]*downloadPreparedLectumShareFile\(target, file\)/,
  );
  assert.doesNotMatch(hookSource, /shareLectumSocialLinkPreviewTarget/);
  assert.doesNotMatch(
    hookSource,
    /target\.mediaType === "video"[\s\S]*shareLectumSocialLinkPreviewTarget\(target\)[\s\S]*shareSocialFileTarget\(target\)/,
  );
  assert.match(shareDialogHookSource, /setPendingTarget\(target\)/);
  assert.match(shareDialogSource, /WhatsAppIcon/);
  assert.match(shareDialogSource, /InstagramIcon/);
  assert.match(shareDialogSource, /MOBILE_SHARE_DESTINATION_OPTIONS/);
  assert.match(shareDialogSource, /DESKTOP_SHARE_DESTINATION_OPTIONS/);
  assert.doesNotMatch(shareDialogSource, /MessageCircle/);
  assert.doesNotMatch(shareDialogSource, /Share2/);
  assert.match(shareDialogSource, /Download/);
  assert.match(shareDialogSource, /Link2/);
  assert.match(shareDialogSource, /Onde deseja compartilhar\?/);
  assert.match(shareDialogSource, /Copie o link ou baixe o/);
  assert.doesNotMatch(shareDialogSource, /Escolha o formato de compartilhamento\./);
  assert.doesNotMatch(shareDialogSource, /Escolha o formato antes de abrir o app de destino\./);
  assert.doesNotMatch(shareDialogSource, /Envia um link com/);
  assert.doesNotMatch(shareDialogSource, /Gera o v[ií]deo completo/);
  assert.doesNotMatch(shareDialogSource, /com arte para redes sociais/);
  assert.doesNotMatch(shareDialogSource, /Salva no dispositivo/);
  assert.match(shareDialogSource, /WhatsApp/);
  assert.match(shareDialogSource, /Redes sociais/);
  assert.match(shareDialogSource, /Copiar link/);
  assert.match(shareDialogSource, /Baixar/);
  assert.match(instagramIconSource, /<title>Instagram<\/title>/);
  assert.match(instagramIconSource, /fill="currentColor"/);
  assert.match(seoMetadataSource, /shareTarget = "default"/);
  assert.match(seoMetadataSource, /openGraphUrl/);
  assert.match(
    seoMetadataSource,
    /const resolvedOpenGraphUrl = resolveCanonicalUrl\(overrides\.openGraphUrl\) \?\? resolvedCanonical/,
  );
  assert.match(seoMetadataSource, /url: resolvedOpenGraphUrl/);
  assert.match(seoMetadataSource, /const suppressVideoPreview = shareTarget === "whatsapp"/);
  assert.match(seoMetadataSource, /whatsappSharePath/);
  assert.match(seoMetadataSource, /openGraphUrl: whatsappSharePath/);
  assert.match(seoMetadataSource, /video: suppressVideoPreview \? null : seo\.og_video_url/);
  assert.match(postWhatsappPageSource, /shareTarget: "whatsapp"/);
  assert.match(replyWhatsappPageSource, /shareTarget: "whatsapp"/);
  assert.match(shareDialogHookSource, /DESKTOP_SHARE_DESTINATION_QUERY/);
  assert.match(shareDialogHookSource, /resolveLectumShareDestinationMode/);
  assert.match(shareDialogHookSource, /target\.kind === "link" \|\| target\.mediaType !== "video"/);
  assert.match(shareDialogHookSource, /prewarmLectumShareArtifact\(target/);
  assert.match(shareDialogHookSource, /SocialArtifactStatus/);
  assert.match(shareDialogHookSource, /SOCIAL_ARTIFACT_STUCK_TIMEOUT_MS/);
  assert.match(shareDialogHookSource, /clearPreparedLectumShareFile\(target\)/);
  assert.match(shareDialogHookSource, /socialArtifactStatus === "preparing"/);
  assert.match(shareDialogHookSource, /SOCIAL_ARTIFACT_PENDING_MESSAGE/);
  assert.match(shareDialogHookSource, /socialArtifactStatus === "failed"[\s\S]*toast\.info/);
  assert.match(shareDialogHookSource, /return;[\s\S]*setPendingTarget\(null\)/);
  assert.doesNotMatch(shareDialogHookSource, /prewarmAndroidSocialFile/);
  assert.doesNotMatch(shareDialogHookSource, /prepareLectumSourceVideoFallbackFile\(target\)/);
  assert.doesNotMatch(shareDialogHookSource, /preparingSocial/);
  assert.doesNotMatch(shareDialogSource, /preparingSocial/);
  assert.doesNotMatch(shareDialogSource, /Preparando v[\s\S]*deo\.\.\./);
  assert.match(seoSource, /professionalVideoTitle/);
  assert.match(seoSource, /resolveVideoOpenGraphDescription/);
  assert.match(seoSource, /\$\{name\} na Lectum/);
  assert.match(postsRequestSource, /SHARE_ARTIFACT_UPLOAD_TIMEOUT_MS = 300_000/);
  assert.match(
    shareArtifactUploadTypeSource,
    /throw new Error\("Arquivo de compartilhamento invalido\."\)/,
  );
  assert.doesNotMatch(shareArtifactUploadTypeSource, /\|\|\s*"video\/mp4"/);
  assert.match(repositorySource, /lectum-share-v8-2026-08-23-android-source-video-fallback/);
  assert.match(repositorySource, /POST_SHARE_ARTIFACT_TTL_DAYS = 7/);
  assert.match(repositorySource, /renewArtifact/);
  assert.match(repositorySource, /last_accessed_at: accessedAt/);
  assert.match(artifactCacheSource, /SHARE_ARTIFACT_VIDEO_FILE_EXTENSIONS/);
  assert.doesNotMatch(artifactCacheSource, /quicktime/);
  assert.doesNotMatch(artifactCacheSource, /png"\)/);
  assert.match(artifactCacheSource, /prewarmLectumShareArtifact/);
  assert.match(artifactCacheSource, /scheduleLectumShareArtifactPrewarm/);
  assert.match(artifactCacheSource, /requestIdleCallback/);
  assert.match(artifactCacheSource, /uploadPostShareArtifact/);
  assert.match(artifactCacheSource, /uploadReplyShareArtifact/);
  assert.match(mediaActionsSource, /if \(res\.data\.shared\)/);
  assert.match(mediaActionsSource, /renewShareArtifactAfterConfirmedShare/);
  assert.match(createPostControllerSource, /scheduleLectumSharePostArtifactPrewarm\(post/);
  assert.match(createPostControllerSource, /authenticated: Boolean\(storedUser\?\.id\)/);
  assert.match(postEditSource, /scheduleLectumSharePostArtifactPrewarm\(updatedPost/);
  assert.match(
    postDetailControllerSource,
    /scheduleLectumShareArtifactPrewarm\([\s\S]*createLectumShareVideoTarget\(post, createdReply/,
  );
  assert.match(
    replyThreadSource,
    /scheduleLectumShareArtifactPrewarm\([\s\S]*createLectumShareVideoTarget\(post, createdReply/,
  );
});

test("fallback operacional compartilha video original sem gravar como artefato social", () => {
  const mediaSource = readFileSync(new URL("./lectum-share-media.ts", import.meta.url), "utf8");
  const hookSource = readFileSync(
    new URL("../hooks/use-lectum-direct-share.ts", import.meta.url),
    "utf8",
  );
  const artifactCacheSource = readFileSync(
    new URL("./lectum-share-artifact-cache.ts", import.meta.url),
    "utf8",
  );

  assert.match(mediaSource, /prepareLectumSourceVideoFallbackFile/);
  assert.match(mediaSource, /sourceVideoFallbackFileCache/);
  assert.match(mediaSource, /sourceVideoFallbackFiles = new WeakSet<File>\(\)/);
  assert.match(mediaSource, /fetch\(mediaUrl\)/);
  assert.match(mediaSource, /contentType\.startsWith\("video\/"\)/);
  assert.match(mediaSource, /SOURCE_VIDEO_FALLBACK_MIME_BY_EXTENSION/);
  assert.match(mediaSource, /"video\/quicktime"/);
  assert.match(mediaSource, /safeFileName\(target, fallbackType\.extension\)/);
  assert.doesNotMatch(
    mediaSource,
    /prepareLectumSourceVideoFallbackFile[\s\S]*preparedShareFileCache\.set/,
  );
  assert.match(
    hookSource,
    /getLectumShareArtifactFile\(socialTarget\)[\s\S]*toast\.loading\(SHARING_TOAST_MESSAGE\)[\s\S]*prepareLectumShareFile\(socialTarget\)\.catch/,
  );
  assert.match(
    hookSource,
    /shouldUseSourceVideoFallback[\s\S]*prepareLectumSourceVideoFallbackFile\(socialTarget\)/,
  );
  assert.doesNotMatch(hookSource, /shouldBypassSocialVideoExport/);
  assert.doesNotMatch(hookSource, /shouldPreferLectumSourceVideoFallbackForSocialShare/);
  assert.match(
    hookSource,
    /!isLectumSourceVideoFallbackFile\(file\)[\s\S]*persistLectumShareArtifact\(socialTarget, file\)/,
  );
  assert.match(
    artifactCacheSource,
    /storedFile[\s\S]*prepareLectumShareFile\(target\)[\s\S]*persistLectumShareArtifact\(target, file\)/,
  );
  assert.doesNotMatch(
    artifactCacheSource,
    /!options\.authenticated \|\| !isLectumShareArtifactTarget/,
  );
  assert.match(
    artifactCacheSource,
    /if \(options\.authenticated\) \{[\s\S]*persistLectumShareArtifact/,
  );
  assert.doesNotMatch(artifactCacheSource, /shouldPreferLectumSourceVideoFallbackForSocialShare/);
  assert.doesNotMatch(artifactCacheSource, /video\/quicktime/);
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

  assert.equal(shareFileTitle(target), "Ana Rubia Papi na Lectum");
  assert.equal(safeFileName(target, "mp4"), "Ana Rubia Papi na Lectum.mp4");
  assert.equal(
    safeFileName(
      {
        ...target,
        cardLabel: "Postado na Lectum",
        kind: "post_media",
      },
      "mp4",
    ),
    "Ana Rubia Papi na Lectum.mp4",
  );
  assert.equal(
    safeFileName(
      {
        ...target,
        professional: { name: "Dra. A/B:C* Psicologa" },
      },
      "mp4",
    ),
    "Dra. ABC Psicologa na Lectum.mp4",
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
  const mediaSource = readFileSync(new URL("./lectum-share-media.ts", import.meta.url), "utf8");
  const videoPreparationSource = mediaSource.slice(
    mediaSource.indexOf("const createLectumShareFile"),
    mediaSource.indexOf("type PreparedShareFileCacheValue"),
  );

  assert.doesNotMatch(source, /MAX_VIDEO_EXPORT_SECONDS/);
  assert.match(source, /recorder\.requestData\(\)/);
  assert.match(source, /lastProgressAt/);
  assert.match(source, /stalled/);
  assert.match(source, /blob\.size === 0/);
  assert.match(videoPreparationSource, /return createVideoShareFile\(target, video\);/);
  assert.doesNotMatch(videoPreparationSource, /fallbackVideo/);
  assert.doesNotMatch(videoPreparationSource, /createImageShareFile\(target, fallbackVideo\)/);
});

test("exportacao de video aguarda frame renderizavel e frames do canvas no Android", () => {
  const layoutSource = readFileSync(
    new URL("./lectum-share-media/layout.ts", import.meta.url),
    "utf8",
  );
  const exportSource = readFileSync(
    new URL("./lectum-share-media/export.ts", import.meta.url),
    "utf8",
  );

  assert.match(layoutSource, /disablePictureInPicture/);
  assert.match(layoutSource, /webkit-playsinline/);
  assert.match(exportSource, /attachVideoElementForCanvas/);
  assert.match(exportSource, /waitForVideoRenderFrame/);
  assert.match(exportSource, /VIDEO_PLAY_TIMEOUT_MS = 8000/);
  assert.match(exportSource, /playVideoForShare/);
  assert.match(exportSource, /requestVideoFrameCallback/);
  assert.match(exportSource, /attachVideoElementForCanvas\(video\)/);
  assert.match(exportSource, /CanvasCaptureStreamTrack/);
  assert.match(exportSource, /createCanvasCaptureFrameRequester/);
  assert.match(exportSource, /videoTrack\?\.requestFrame\?\.\(\)/);
  assert.match(exportSource, /requestCanvasCaptureFrame\(\)/);
  assert.match(exportSource, /window\.setTimeout\(draw, 1000 \/ VIDEO_EXPORT_FRAME_RATE\)/);
  assert.match(
    exportSource,
    /await playVideoForShare\(video\);\s*await waitForVideoRenderFrame\(video\);/,
  );
  assert.match(
    exportSource,
    /await waitForVideoRenderFrame\(video\);[\s\S]*drawLectumShareFrame\(ctx, video[\s\S]*recorder\.start\(1000\)/,
  );
  assert.match(
    exportSource,
    /failExport\(new Error\("Nao foi possivel gravar o video inteiro para compartilhamento\."\)\)/,
  );
  assert.doesNotMatch(
    exportSource,
    /video\.ended \|\| reachedKnownEnd \|\| stalled \|\| elapsed >= safetyTimeoutMs/,
  );
  assert.doesNotMatch(exportSource, /return createImageShareFile\(target, video\)/);
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
  assert.match(repositorySource, /lectum-share-v8-2026-08-23-android-source-video-fallback/);
});

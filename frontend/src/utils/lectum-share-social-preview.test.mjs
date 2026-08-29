import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("meus posts permite baixar video profissional com arte sem alterar compartilhar por link", () => {
  const targetSource = readFileSync(new URL("./lectum-share-target.ts", import.meta.url), "utf8");
  const mediaSource = readFileSync(new URL("./lectum-share-media.ts", import.meta.url), "utf8");
  const mineLogicSource = readFileSync(
    new URL("../app/app/posts/mine/logic.tsx", import.meta.url),
    "utf8",
  );
  const replyItemCardSource = readFileSync(
    new URL("../app/app/posts/mine/components/reply-item-card.tsx", import.meta.url),
    "utf8",
  );
  const communityMediaFrameSource = readFileSync(
    new URL("../components/community/community-media-frame.tsx", import.meta.url),
    "utf8",
  );
  const communityPostCardSource = readFileSync(
    new URL("../components/community/community-post-card.tsx", import.meta.url),
    "utf8",
  );
  const communityFeedCardSource = readFileSync(
    new URL("../app/app/community/[slug]/components/post-card.tsx", import.meta.url),
    "utf8",
  );
  const postDetailSource = readFileSync(
    new URL("../app/app/community/[slug]/post/[id]/components/post-content.tsx", import.meta.url),
    "utf8",
  );
  const replyCardSource = readFileSync(
    new URL("../app/app/community/[slug]/post/[id]/components/reply-card.tsx", import.meta.url),
    "utf8",
  );
  const savedReplyCardSource = readFileSync(
    new URL("../app/app/posts/saved/components/saved-reply-card.tsx", import.meta.url),
    "utf8",
  );
  const artifactCacheSource = readFileSync(
    new URL("./lectum-share-artifact-cache.ts", import.meta.url),
    "utf8",
  );
  const shareArtifactServiceSource = readFileSync(
    new URL(
      "../../../backend/src/modules/api/private/posts/use-cases/services/share-artifact.ts",
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
  const downloadHookSource = readFileSync(
    new URL("../hooks/use-lectum-share-download-dialog.tsx", import.meta.url),
    "utf8",
  );
  const downloadDialogSource = readFileSync(
    new URL("../components/community/lectum-share-download-dialog.tsx", import.meta.url),
    "utf8",
  );
  const shareDialogHookSource = readFileSync(
    new URL("../hooks/use-lectum-share-dialog.tsx", import.meta.url),
    "utf8",
  );
  const directShareHookSource = readFileSync(
    new URL("../hooks/use-lectum-direct-share.ts", import.meta.url),
    "utf8",
  );
  const instagramIconSource = readFileSync(
    new URL("../components/ui/instagram-icon.tsx", import.meta.url),
    "utf8",
  );
  const downloadFactorySource = targetSource.slice(
    targetSource.indexOf("export const createLectumShareVideoDownloadTarget"),
  );
  const postDownloadFactorySource = targetSource.slice(
    targetSource.indexOf("export const createLectumSharePostVideoDownloadTarget"),
    targetSource.indexOf("export const createLectumShareVideoDownloadTarget"),
  );

  assert.match(downloadFactorySource, /kind: "video_response"/);
  assert.match(
    downloadFactorySource,
    /mediaItems: \[\{ mediaType: "video", mediaUrl: reply\.media_url \}\]/,
  );
  assert.match(downloadFactorySource, /posterUrl: reply\.thumbnail_url \?\? null/);
  assert.match(downloadFactorySource, /const responseText = reply\.content\?\.trim\(\) \|\| null/);
  assert.match(downloadFactorySource, /publicCommunityReplyWhatsappShareHref/);
  assert.match(mineLogicSource, /useLectumShareDownloadDialog/);
  assert.match(mineLogicSource, /createLectumShareVideoDownloadTarget/);
  assert.match(mineLogicSource, /createLectumSharePostVideoDownloadTarget/);
  assert.match(mineLogicSource, /post\.author\.id !== currentPsychologistUserId/);
  assert.match(mineLogicSource, /replyTarget\.author\.id !== currentPsychologistUserId/);
  assert.match(mineLogicSource, /openLectumDownloadDialog\(socialTarget\)/);
  assert.match(replyItemCardSource, /onDownloadVideo/);
  assert.match(replyItemCardSource, /canDownloadVideo/);
  assert.match(replyItemCardSource, /InstagramIcon/);
  assert.match(replyItemCardSource, /reply\.author\.id === currentUserId/);
  assert.match(replyItemCardSource, /overlayAction/);
  assert.match(replyItemCardSource, /Abrir pr.via para redes sociais/i);
  assert.doesNotMatch(replyItemCardSource, /mt-2 flex h-11 w-full/);
  assert.match(communityMediaFrameSource, /overlayAction/);
  assert.match(communityMediaFrameSource, /aria-label=\{overlayAction\.ariaLabel\}/);
  assert.match(communityMediaFrameSource, /absolute top-3 right-3 z-20/);
  assert.match(communityMediaFrameSource, /bg-media-background\/35/);
  assert.match(communityMediaFrameSource, /text-media-foreground/);
  assert.match(instagramIconSource, /viewBox="-0\.125 -0\.125 24\.25 24\.25"/);
  assert.match(communityMediaFrameSource, /data-post-card-ignore-click="true"/);
  assert.match(
    communityMediaFrameSource,
    /event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);[\s\S]*overlayAction\.onClick\(event\)/,
  );
  assert.match(postDownloadFactorySource, /kind: "post_media"/);
  assert.match(postDownloadFactorySource, /cardLabel: "Postado na Lectum"/);
  assert.match(postDownloadFactorySource, /getFirstShareablePostVideoMedia\(post\)/);
  assert.match(postDownloadFactorySource, /responseText: post\.content\.trim\(\) \|\| null/);
  assert.match(postDownloadFactorySource, /posterUrl: videoMedia\.posterUrl/);
  assert.match(artifactCacheSource, /createLectumSharePostVideoDownloadTarget/);
  for (const surfaceSource of [
    communityPostCardSource,
    communityFeedCardSource,
    postDetailSource,
    replyCardSource,
    savedReplyCardSource,
  ]) {
    assert.match(surfaceSource, /onOpenSocialVideoPreview/);
  }
  assert.match(communityPostCardSource, /displayAuthor\.id === currentUserId/);
  assert.match(communityFeedCardSource, /post\.author\.id === currentUserId/);
  assert.match(postDetailSource, /post\.author\.id === currentUserId/);
  assert.match(replyCardSource, /reply\.author\.id === currentUserId/);
  assert.match(savedReplyCardSource, /reply\.author\.id === currentUserId/);
  assert.match(repositorySource, /listExpired/);
  assert.match(repositorySource, /markDeleted/);
  assert.doesNotMatch(repositorySource, /authorId: string|upsertArtifact|renewArtifact/);
  assert.match(shareArtifactServiceSource, /post_share_artifact_unavailable/);
  assert.match(shareArtifactServiceSource, /deleteShareArtifactObject\(key\)/);
  assert.doesNotMatch(shareArtifactServiceSource, /canUseShareArtifactPreview|upsertShareArtifact/);
  assert.doesNotMatch(replyItemCardSource, /import \{ Download, Reply \} from "lucide-react"/);
  assert.match(downloadHookSource, /LectumShareDownloadDialog/);
  assert.match(
    downloadHookSource,
    /const result = await shareLectumTarget\(pendingTarget, \{ destination: "download" \}\)[\s\S]*if \(result\?\.mode === "download"\)/,
  );
  assert.match(downloadHookSource, /LECTUM_SHARE_PREVIEW_SHEET_EXIT_MS/);
  assert.match(downloadHookSource, /setIsDownloadDialogOpen\(false\)/);
  assert.match(downloadHookSource, /setTimeout\([\s\S]*setPendingTarget\(null\)/);
  assert.match(downloadHookSource, /setIsDownloadDialogOpen\(true\)/);
  assert.match(downloadHookSource, /open=\{isDownloadDialogOpen\}/);
  assert.match(downloadDialogSource, /VerticalVideoPlayer/);
  assert.match(downloadDialogSource, /LECTUM_SHARE_PREVIEW_SHEET_EXIT_MS = 300/);
  assert.match(downloadDialogSource, /const sheetMotionState = open \? "enter" : "exit"/);
  assert.match(downloadDialogSource, /data-lectum-share-download-sheet="true"/);
  assert.match(downloadDialogSource, /lectum-share-download-sheet-enter/);
  assert.match(downloadDialogSource, /lectum-share-download-sheet-exit/);
  assert.match(downloadDialogSource, /max-w-\[min\(100vw,44rem\)\]/);
  assert.match(downloadDialogSource, /pb-\[calc\(var\(--lectum-bottom-fixed-padding\)\+1rem\)\]/);
  assert.doesNotMatch(downloadDialogSource, /px-3 pb-3/);
  assert.doesNotMatch(downloadDialogSource, /max-w-\[430px\]/);
  assert.match(downloadDialogSource, /storyCanvasLayout/);
  assert.match(downloadDialogSource, /fit="contain"/);
  assert.doesNotMatch(downloadDialogSource, /fit="cover"/);
  assert.match(downloadDialogSource, /poster=\{resolvedPosterUrl\}/);
  assert.match(downloadDialogSource, /controls=\{false\}/);
  assert.match(downloadDialogSource, /useLayoutEffect/);
  assert.match(downloadDialogSource, /const pauseBackgroundMedia = \(\) =>/);
  assert.match(downloadDialogSource, /querySelectorAll<HTMLMediaElement>\("audio, video"\)/);
  assert.match(downloadDialogSource, /media\.closest\(PREVIEW_SHEET_SELECTOR\)/);
  assert.match(downloadDialogSource, /const PREVIEW_VIDEO_SELECTOR/);
  assert.match(downloadDialogSource, /const pausePreviewMediaBeforeDownload = \(\) =>/);
  assert.match(
    downloadDialogSource,
    /querySelectorAll<HTMLMediaElement>\(PREVIEW_VIDEO_SELECTOR\)/,
  );
  assert.match(downloadDialogSource, /playVideoWithSound\(previewVideo\)/);
  assert.match(downloadDialogSource, /previewVideo\.pause\(\)/);
  assert.match(downloadDialogSource, /const handleDownload = \(\) =>/);
  assert.match(downloadDialogSource, /pausePreviewMediaBeforeDownload\(\)/);
  assert.match(downloadDialogSource, /onClick=\{handleDownload\}/);
  assert.match(downloadDialogSource, /"data-lectum-share-preview-video": "true"/);
  assert.match(downloadDialogSource, /muted: false/);
  assert.doesNotMatch(downloadDialogSource, /muted: true/);
  assert.match(downloadDialogSource, /maskImage: 'url\("\/logo-icon\.svg"\)'/);
  assert.match(downloadDialogSource, /WebkitMaskImage: 'url\("\/logo-icon\.svg"\)'/);
  assert.doesNotMatch(downloadDialogSource, /brightness-0 invert/);
  assert.doesNotMatch(downloadDialogSource, /import Image from "next\/image"/);
  assert.match(
    downloadDialogSource,
    /const descriptionText = target\.responseText\?\.trim\(\) \?\? ""/,
  );
  assert.doesNotMatch(downloadDialogSource, /target\.shareText\.trim\(\)/);
  assert.match(downloadDialogSource, /navigator\.clipboard\.writeText\(descriptionText\)/);
  assert.match(downloadDialogSource, /Descrição copiada\./);
  assert.match(downloadDialogSource, /Copiar descrição/);
  assert.match(downloadDialogSource, /className="flex items-start gap-3 px-1"/);
  assert.match(downloadDialogSource, /text-muted-foreground text-sm leading-6/);
  assert.match(downloadDialogSource, /text-muted-foreground\/60/);
  assert.doesNotMatch(downloadDialogSource, /bg-surface-muted\/70/);
  assert.doesNotMatch(downloadDialogSource, />Descrição<\/p>/);
  assert.match(downloadDialogSource, /<Copy className="h-4 w-4"/);
  assert.match(downloadDialogSource, /id="lectum-share-download-title"/);
  assert.match(downloadDialogSource, /Publique nas redes sociais/);
  assert.match(
    downloadDialogSource,
    /Baixe o v.deo personalizado para postar no Instagram e TikTok\./,
  );
  assert.match(downloadDialogSource, /Baixar v.deo/);
  assert.doesNotMatch(downloadDialogSource, /WhatsApp|Copiar link|9:16/);
  assert.match(mediaSource, /APPLE_MOBILE_DOWNLOAD_USER_AGENT_PATTERN/);
  assert.match(mediaSource, /isAppleMobileShareDownloadRuntime/);
  assert.match(mediaSource, /shareFileThroughAppleMobileSheet/);
  assert.match(mediaSource, /resolveLectumFileShareData\(nav/);
  assert.match(mediaSource, /isNativeShareActivationError\(error\)[\s\S]*mode: "prepared"/);
  assert.match(directShareHookSource, /DOWNLOAD_READY_RETRY_MESSAGE/);
  assert.match(shareDialogHookSource, /shareDestinationDialog: null/);
  assert.match(shareDialogHookSource, /toLectumLinkOnlyTarget/);
});

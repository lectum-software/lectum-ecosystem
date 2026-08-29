import type { ShareRenderTarget } from "./types";

const MAX_SHARE_RENDER_FILE_BASE_LENGTH = 80;

const normalizeFileBase = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, MAX_SHARE_RENDER_FILE_BASE_LENGTH)
    .replace(/-+$/g, "");

export const toShareRenderFileName = (
  target: Pick<ShareRenderTarget, "postId" | "replyId" | "shareTitle">,
) => {
  const base = normalizeFileBase(target.shareTitle) || "lectum-video";
  const suffix = target.replyId ? target.replyId : target.postId;
  const shortSuffix = normalizeFileBase(suffix).slice(0, 12) || "share";

  return `${base}-${shortSuffix}.mp4`;
};

export const automaticCaptionIds = (env = process.env) => {
  if (env.VIDEO_CAPTIONS_AUTO_ENABLED !== "true") return [];
  const ids = [
    ...new Set(
      (env.VIDEO_CAPTIONS_ASSET_IDS ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  return ids.length <= 10 && ids.every((id) => /^[a-z0-9_-]{8,64}$/i.test(id)) ? ids : [];
};

export const automaticCaptionAction = (
  videoStatus: string,
  caption: { state: string; updated_at: Date } | null,
  now = Date.now(),
): "generate" | "sync" | null => {
  if (videoStatus !== "ready") return null;
  if (!caption) return "generate";
  if (caption.state !== "inprogress") return null;
  const age = now - caption.updated_at.getTime();
  return age >= 60_000 && age <= 24 * 60 * 60 * 1000 ? "sync" : null;
};

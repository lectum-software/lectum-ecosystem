"use client";

import { getPreparedLectumShareFile } from "@/utils/lectum-share-media";
import type {
  createLectumSharePostVideoDownloadTarget,
  LectumShareSocialTarget,
  LectumShareVideoTarget,
} from "@/utils/lectum-share-target";

type ShareablePostWithMedia = Parameters<typeof createLectumSharePostVideoDownloadTarget>[0];

type ShareArtifactPrewarmOptions = {
  authenticated?: boolean;
};

export const isLectumShareArtifactTarget = (
  target?: LectumShareVideoTarget | null,
): target is LectumShareSocialTarget =>
  Boolean(target && target.kind !== "link" && target.mediaType === "video");

export const prewarmLectumShareArtifact = async (
  target?: LectumShareVideoTarget | null,
  options: ShareArtifactPrewarmOptions = {},
) => {
  void options;
  if (!isLectumShareArtifactTarget(target)) return null;

  return getPreparedLectumShareFile(target);
};

export const scheduleLectumShareArtifactPrewarm = (
  _target?: LectumShareVideoTarget | null,
  options: ShareArtifactPrewarmOptions = {},
) => {
  void options;
  // Cache remoto/R2 e pre-render em background foram desativados: o video com arte
  // e preparado somente sob demanda na acao explicita do psicologo.
};

export const scheduleLectumSharePostArtifactPrewarm = (
  _post: ShareablePostWithMedia,
  options: ShareArtifactPrewarmOptions = {},
) => {
  void options;
  // Mantem a API interna como compatibilidade de chamada sem acionar preparo remoto/local.
};

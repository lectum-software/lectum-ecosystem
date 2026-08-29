import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  IPostRenderShareArtifactDTO,
  IPostRenderShareArtifactJobDTO,
  PostShareRenderJobResponse,
} from "../../DTOs/IPostDTO";
import { PostRepository } from "../../repositories/PostRepository";
import { ensureCommunityActor, notFound } from "./post-support";
import {
  getShareRenderJobResult,
  getShareRenderJobSnapshot,
  type ShareRenderJobSnapshot,
  startShareRenderJob,
} from "./share-render/jobs";
import { renderShareVideoWithChromium } from "./share-render/renderer";
import type { ShareRenderResult, ShareRenderTarget } from "./share-render/types";

type ShareArtifactRenderSuccess = Resolve & {
  data: ShareRenderResult;
  success: true;
};

type ShareArtifactRenderJobSuccess = Resolve & {
  data: PostShareRenderJobResponse;
  success: true;
};

type ShareRenderTargetResolution = Resolve | { success: true; target: ShareRenderTarget };

type ShareRenderJobResolution =
  | Resolve
  | {
      snapshot: ShareRenderJobSnapshot;
      success: true;
      target: ShareRenderTarget;
    };

const invalidRenderMedia = () => ({
  status: 422,
  ...error("post_share_artifact_render_media_invalid", {}),
});

const invalidRenderTarget = () => ({
  status: 403,
  ...error("post_share_artifact_render_target_invalid", {}),
});

const renderUnavailable = () => ({
  status: 503,
  ...error("post_share_artifact_render_unavailable", {}),
});

const toJobResponse = (snapshot: ShareRenderJobSnapshot): PostShareRenderJobResponse => ({
  created_at: snapshot.createdAt,
  expires_at: snapshot.expiresAt,
  job_id: snapshot.id,
  ready: snapshot.ready,
  retry_after_ms: snapshot.retryAfterMs,
  size_bytes: snapshot.sizeBytes,
  status: snapshot.status,
});

const hasResolvedShareRenderTarget = (
  value: ShareRenderTargetResolution,
): value is { success: true; target: ShareRenderTarget } =>
  value.success === true && "target" in value;

const hasResolvedShareRenderJob = (
  value: ShareRenderJobResolution,
): value is { snapshot: ShareRenderJobSnapshot; success: true; target: ShareRenderTarget } =>
  value.success === true && "snapshot" in value;

const resolveShareRenderTarget = async (
  data: IPostRenderShareArtifactDTO,
): Promise<ShareRenderTargetResolution> => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const target = await repository.findShareRenderTarget({
    postId: data.p.id,
    replyId: data.p.replyId,
    userId: data.auth.id!,
  });

  if (target.kind === "not_found") return notFound();
  if (target.kind === "forbidden") return invalidRenderTarget();
  if (target.kind === "invalid_media") return invalidRenderMedia();
  if (target.kind === "invalid_target") return invalidRenderTarget();
  if (target.kind !== "ok") return renderUnavailable();

  return { success: true as const, target: target.data };
};

const missingRenderJob = () => ({
  status: 404,
  ...error("post_share_artifact_render_unavailable", {}),
});

export const renderShareArtifact = async (
  data: IPostRenderShareArtifactDTO,
): Promise<Resolve | ShareArtifactRenderSuccess> => {
  const resolved = await resolveShareRenderTarget(data);
  if (!hasResolvedShareRenderTarget(resolved)) return resolved;

  try {
    return {
      status: 200,
      ...msg("post_share_artifact_rendered", {}),
      data: await renderShareVideoWithChromium(resolved.target),
    };
  } catch {
    return renderUnavailable();
  }
};

export const startRenderShareArtifactJob = async (
  data: IPostRenderShareArtifactJobDTO,
): Promise<Resolve | ShareArtifactRenderJobSuccess> => {
  const resolved = await resolveShareRenderTarget(data);
  if (!hasResolvedShareRenderTarget(resolved)) return resolved;

  const snapshot = startShareRenderJob({
    target: resolved.target,
    userId: data.auth.id!,
  });

  return {
    data: toJobResponse(snapshot),
    status: snapshot.ready ? 200 : 202,
    success: true,
  };
};

const resolveShareRenderJobSnapshot = async (
  data: IPostRenderShareArtifactJobDTO,
): Promise<ShareRenderJobResolution> => {
  if (!data.p.jobId) return missingRenderJob();

  const resolved = await resolveShareRenderTarget(data);
  if (!hasResolvedShareRenderTarget(resolved)) return resolved;

  const snapshot = getShareRenderJobSnapshot({
    jobId: data.p.jobId,
    postId: resolved.target.postId,
    replyId: resolved.target.replyId,
    userId: data.auth.id!,
  });

  if (!snapshot) return missingRenderJob();

  return { success: true as const, snapshot, target: resolved.target };
};

export const getRenderShareArtifactJob = async (
  data: IPostRenderShareArtifactJobDTO,
): Promise<Resolve | ShareArtifactRenderJobSuccess> => {
  const resolved = await resolveShareRenderJobSnapshot(data);
  if (!hasResolvedShareRenderJob(resolved)) return resolved;

  return {
    data: toJobResponse(resolved.snapshot),
    status: 200,
    success: true,
  };
};

export const getRenderShareArtifactJobFile = async (
  data: IPostRenderShareArtifactJobDTO,
): Promise<Resolve | ShareArtifactRenderSuccess> => {
  const resolved = await resolveShareRenderJobSnapshot(data);
  if (!hasResolvedShareRenderJob(resolved)) return resolved;

  if (resolved.snapshot.status === "processing") {
    return {
      data: toJobResponse(resolved.snapshot),
      status: 202,
      success: true,
    };
  }

  if (!resolved.snapshot.ready) return renderUnavailable();

  const result = getShareRenderJobResult({
    jobId: data.p.jobId!,
    postId: resolved.target.postId,
    replyId: resolved.target.replyId,
    userId: data.auth.id!,
  });

  if (!result) return missingRenderJob();

  return {
    data: result,
    status: 200,
    success: true,
  };
};

import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import prisma from "@/infra/database/prisma";
import { getVideoProcessingServiceConfig } from "@/infra/video-processing";
import {
  getVideoStreamConfig,
  getVideoStreamProvider,
  isCloudflareStreamVideoUid,
  videoAssetIdFromReference,
} from "@/infra/video-stream";
import { getJwtSecret } from "@/modules/api/middlewares/_auth/utils/jwt-secret";
import { VideoAssetRepository } from "@/modules/video-assets/repository";
import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import { getPrimaryPublicWebOrigin, parsePublicHttpOrigin } from "@/utils/public-origin";
import type {
  IPostRenderShareArtifactDTO,
  IPostRenderShareArtifactJobDTO,
} from "../../DTOs/IPostDTO";
import {
  type AuthorResult,
  authorSelect,
  authorTypeLabel,
  isProfessionalVerified,
} from "../../repositories/support/post-response";
import { ensureCommunityActor } from "./post-support";
import {
  createShareRenderJobHandle,
  resolveShareRenderJobId,
  SHARE_RENDER_JOB_ID_PATTERN,
} from "./share-render-job-access";
import { selectSharePostVideoMediaUrl } from "./share-render-media";
import {
  resolveLegacyPostMediaSourceUrlForRender,
  type ShareRenderSource,
} from "./share-render-source";

const VIDEO_SERVICE_FILE_TIMEOUT_MS = 390_000;
const VIDEO_SERVICE_READY_TIMEOUT_MS = 20_000;
const VIDEO_SERVICE_START_TIMEOUT_MS = 30_000;
const VIDEO_SERVICE_START_RETRY_WINDOW_MS = 75_000;
const VIDEO_SERVICE_START_RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 12_000] as const;
const VIDEO_SERVICE_START_RETRY_MIN_DELAY_MS = 500;
const VIDEO_SERVICE_CODE_PATTERN = /^[a-z][a-z0-9_]{1,64}$/;

type VideoServiceJobData = {
  completed_at: string | null;
  created_at: string;
  download_url: string | null;
  failed_at: string | null;
  failure_code: "canceled" | "invalid_video" | "processing_failed" | null;
  job_id: string;
  output_size_bytes: number | null;
  progress: number;
  started_at: string | null;
  status: "queued" | "processing" | "completed" | "failed" | "cancel_requested" | "canceled";
};

type VideoServiceEnvelope = {
  code?: unknown;
  data?: unknown;
  error?: unknown;
  message?: unknown;
  success?: unknown;
};

export type ShareRenderTarget = {
  cardLabel: string;
  fileName: string;
  mediaUrl: string;
  postId: string;
  professionalName: string;
  professionalRoleLabel: string;
  professionalVerified: boolean;
  replyId: string | null;
  responseText: string | null;
  sourceText: string;
};

export type ResolvedShareRenderTarget = ShareRenderTarget & ShareRenderSource;

type ShareRenderJobScope = {
  ownerId: string;
  postId: string;
  replyId: string | null;
};

export type RenderShareArtifactJobFileResult =
  | Resolve
  | {
      body: ReadableStream<Uint8Array>;
      headers: Record<string, string>;
      kind: "file";
      status: number;
    };

export const isRenderShareArtifactJobFileResult = (
  result: RenderShareArtifactJobFileResult,
): result is Extract<RenderShareArtifactJobFileResult, { kind: "file" }> =>
  "kind" in result && result.kind === "file";

const renderUnavailable = (): Resolve => ({
  status: 503,
  ...error("post_share_artifact_render_unavailable", {}),
});

const invalidRenderTarget = (status = 422): Resolve => ({
  status,
  ...error("post_share_artifact_render_target_invalid", {}),
});

const invalidRenderMedia = (): Resolve => ({
  status: 422,
  ...error("post_share_artifact_render_media_invalid", {}),
});

const logShareRenderServiceWarning = (
  reason: string,
  details: { code?: string | null; status?: number } = {},
) => {
  const payload: { code?: string; reason: string; status?: number } = { reason };
  if (details.code) payload.code = details.code;
  if (typeof details.status === "number") payload.status = details.status;
  console.warn("[POST_SHARE_RENDER_SERVICE]", payload);
};

const requestVideoService = async (
  path: string,
  init: RequestInit = {},
  timeoutMs?: number,
): Promise<Response | null> => {
  const config = getVideoProcessingServiceConfig();
  if (!config) {
    logShareRenderServiceWarning("config_missing");
    return null;
  }

  try {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${config.apiKey}`);

    return await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs ?? config.requestTimeoutMs),
    });
  } catch {
    logShareRenderServiceWarning("request_failed");
    return null;
  }
};

const waitForVideoServiceRetry = (durationMs: number) =>
  new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, durationMs);
    timeout.unref();
  });

const isTransientVideoServiceStartResponse = (response: Response | null) =>
  !response || response.status === 408 || response.status === 425 || response.status >= 500;

const getVideoServiceStartRetryDelay = (attempt: number) =>
  VIDEO_SERVICE_START_RETRY_DELAYS_MS[
    Math.min(attempt, VIDEO_SERVICE_START_RETRY_DELAYS_MS.length - 1)
  ] ?? 12_000;

const requestVideoServiceForJobStart = async (
  path: string,
  init: RequestInit = {},
): Promise<Response | null> => {
  if (!getVideoProcessingServiceConfig()) {
    return requestVideoService(path, init, VIDEO_SERVICE_START_TIMEOUT_MS);
  }

  const deadlineAt = Date.now() + VIDEO_SERVICE_START_RETRY_WINDOW_MS;
  let attempt = 0;

  while (true) {
    const readiness = await requestVideoService(
      "/ready",
      { headers: { Accept: "application/json" }, method: "GET" },
      VIDEO_SERVICE_READY_TIMEOUT_MS,
    );
    if (!readiness?.ok) {
      if (readiness && !isTransientVideoServiceStartResponse(readiness)) return readiness;

      const remainingMs = deadlineAt - Date.now();
      const delayMs = Math.min(getVideoServiceStartRetryDelay(attempt), remainingMs);
      if (delayMs < VIDEO_SERVICE_START_RETRY_MIN_DELAY_MS) return readiness;

      if (readiness) {
        logShareRenderServiceWarning("start_readiness_retry", { status: readiness.status });
        await readiness.body?.cancel().catch(() => undefined);
      } else {
        logShareRenderServiceWarning("start_readiness_retry");
      }
      attempt += 1;
      await waitForVideoServiceRetry(delayMs);
      continue;
    }
    await readiness.body?.cancel().catch(() => undefined);

    const response = await requestVideoService(path, init, VIDEO_SERVICE_START_TIMEOUT_MS);
    if (!isTransientVideoServiceStartResponse(response)) return response;

    const remainingMs = deadlineAt - Date.now();
    const delayMs = Math.min(getVideoServiceStartRetryDelay(attempt), remainingMs);
    if (delayMs < VIDEO_SERVICE_START_RETRY_MIN_DELAY_MS) return response;

    if (response) {
      logShareRenderServiceWarning("start_transient_retry", { status: response.status });
      await response.body?.cancel().catch(() => undefined);
    } else {
      logShareRenderServiceWarning("start_transient_retry");
    }
    attempt += 1;
    await waitForVideoServiceRetry(delayMs);
  }
};

const readVideoServiceEnvelope = async (
  response: Response,
): Promise<VideoServiceEnvelope | null> => {
  try {
    return (await response.json()) as VideoServiceEnvelope;
  } catch {
    return null;
  }
};

const isVideoJobData = (value: unknown): value is VideoServiceJobData => {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<VideoServiceJobData>;

  return (
    typeof data.job_id === "string" &&
    SHARE_RENDER_JOB_ID_PATTERN.test(data.job_id) &&
    typeof data.status === "string" &&
    ["queued", "processing", "completed", "failed", "cancel_requested", "canceled"].includes(
      data.status,
    ) &&
    typeof data.progress === "number"
  );
};

const targetJobScope = (
  ownerId: string,
  target: Pick<ShareRenderTarget, "postId" | "replyId">,
): ShareRenderJobScope => ({
  ownerId,
  postId: target.postId,
  replyId: target.replyId,
});

const jobResponse = (status: number, data: VideoServiceJobData, handle: string): Resolve => ({
  status,
  ...msg("post_share_artifact_rendered", {}),
  data: { ...data, job_id: handle, download_url: null },
});

const mapVideoServiceFailure = async (response: Response | null): Promise<Resolve> => {
  if (!response) return renderUnavailable();

  const envelope = await readVideoServiceEnvelope(response);
  const code =
    typeof envelope?.code === "string" && VIDEO_SERVICE_CODE_PATTERN.test(envelope.code)
      ? envelope.code
      : null;

  logShareRenderServiceWarning("response_not_ok", { code, status: response.status });

  if (response.status === 401 || response.status === 403) return renderUnavailable();
  if (response.status === 404) return invalidRenderTarget(404);
  if (response.status === 422 || code === "invalid_video") return invalidRenderMedia();
  if (response.status === 429 || code === "queue_full") {
    return {
      status: 429,
      ...error("post_share_artifact_render_unavailable", {}),
    };
  }

  return renderUnavailable();
};

export const normalizeShareText = (
  value: string | null | undefined,
  fallback: string,
  maxLength: number,
) => {
  const normalized = String(value ?? "")
    .replace(/\s+/gu, " ")
    .trim();

  return (normalized || fallback).slice(0, maxLength);
};

const slugifyFileSegment = (value: string) => {
  const normalized = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 72);

  return normalized || "video";
};

const normalizeText = normalizeShareText;

export const buildShareFileName = (professionalName: string, sourceText: string) => {
  const name = slugifyFileSegment(professionalName);
  const context = slugifyFileSegment(sourceText);
  return `${name}-${context}-Lectum.mp4`;
};

const professionalInfo = (author: AuthorResult) => {
  const profile = author.psychologist_profile;
  const professionalName = buildProfessionalFullDisplayName({
    fallbackName: author.name,
    firstName: profile?.professional_first_name,
    lastName: profile?.professional_last_name,
  });

  return {
    professionalName: normalizeText(professionalName, "Profissional Lectum", 90),
    professionalRoleLabel: authorTypeLabel(author.role, profile?.gender, false),
    professionalVerified: isProfessionalVerified(profile),
  };
};

const ensureOwnerPsychologistTarget = (
  data: IPostRenderShareArtifactDTO | IPostRenderShareArtifactJobDTO,
  author: AuthorResult,
) => {
  if (data.auth.role !== "psicologo" || author.role !== "psicologo" || author.id !== data.auth.id) {
    return invalidRenderTarget(403);
  }

  return null;
};

const streamPlaybackRequestOrigin = () => {
  const streamConfig = getVideoStreamConfig();
  const webOrigin = getPrimaryPublicWebOrigin({ productionRuntime: true });

  if (streamConfig && webOrigin && streamConfig.allowedOrigins.includes(new URL(webOrigin).host)) {
    return webOrigin;
  }

  const firstAllowedOrigin = streamConfig?.allowedOrigins[0];
  return firstAllowedOrigin
    ? parsePublicHttpOrigin(`https://${firstAllowedOrigin}`, { productionRuntime: true })
    : null;
};

const streamMediaSourceUrl = async (
  mediaUrl: string,
  ownerId: string,
): Promise<ShareRenderSource | null> => {
  const assetId = videoAssetIdFromReference(mediaUrl);
  if (!assetId) return null;

  const asset = await new VideoAssetRepository().findOwned(assetId, ownerId);
  if (
    asset?.status !== "ready" ||
    asset.provider !== "cloudflare_stream" ||
    !isCloudflareStreamVideoUid(asset.provider_uid)
  ) {
    return null;
  }

  const provider = getVideoStreamProvider();
  if (!provider) return null;

  return {
    sourceOrigin: streamPlaybackRequestOrigin(),
    sourceUrl: provider.createPlayback(asset.provider_uid).hlsUrl,
  };
};

export const resolveShareRenderSourceUrl = async (target: ShareRenderTarget, ownerId: string) =>
  (await streamMediaSourceUrl(target.mediaUrl, ownerId)) ??
  resolveLegacyPostMediaSourceUrlForRender(target.mediaUrl);

const postTargetSelect = {
  id: true,
  title: true,
  content: true,
  media_url: true,
  media_type: true,
  media_items: {
    orderBy: { position: "asc" },
    select: {
      media_type: true,
      media_url: true,
    },
    where: { deleted: false },
  },
  status: true,
  author: {
    select: authorSelect,
  },
} as const;

const replyTargetSelect = {
  id: true,
  title: true,
  content: true,
  media_url: true,
  media_type: true,
  parent_reply_id: true,
  parent_reply: {
    select: {
      content: true,
    },
  },
  author: {
    select: authorSelect,
  },
  post: {
    select: {
      content: true,
      id: true,
      status: true,
      title: true,
    },
  },
} as const;

const resolveShareRenderTarget = async (
  data: IPostRenderShareArtifactDTO | IPostRenderShareArtifactJobDTO,
): Promise<Resolve | ResolvedShareRenderTarget> => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  if (data.p.replyId) {
    const reply = await prisma.post_reply.findFirst({
      where: {
        deleted: false,
        id: data.p.replyId,
        post_id: data.p.id,
        post: {
          deleted: false,
          id: data.p.id,
          status: "publicado",
          community: { active: true, deleted: false },
        },
      },
      select: replyTargetSelect,
    });

    if (!reply) return invalidRenderTarget(404);
    const forbidden = ensureOwnerPsychologistTarget(data, reply.author);
    if (forbidden) return forbidden;
    if (reply.media_type !== "video" || !reply.media_url) return invalidRenderMedia();

    const sourceText = normalizeText(
      reply.parent_reply_id ? reply.parent_reply?.content : reply.post.title,
      reply.post.content,
      180,
    );
    const info = professionalInfo(reply.author);
    const target: ShareRenderTarget = {
      ...info,
      cardLabel: "Respondido na Lectum",
      fileName: buildShareFileName(info.professionalName, sourceText),
      mediaUrl: reply.media_url,
      postId: data.p.id,
      replyId: reply.id,
      responseText: normalizeText(reply.content, "Resposta profissional", 180),
      sourceText,
    };
    const source = await resolveShareRenderSourceUrl(target, reply.author.id);
    return source ? { ...target, ...source } : invalidRenderMedia();
  }

  const post = await prisma.community_post.findFirst({
    where: {
      deleted: false,
      id: data.p.id,
      status: "publicado",
      community: { active: true, deleted: false },
    },
    select: postTargetSelect,
  });

  if (!post) return invalidRenderTarget(404);
  const forbidden = ensureOwnerPsychologistTarget(data, post.author);
  if (forbidden) return forbidden;
  const postMediaUrl = selectSharePostVideoMediaUrl(post);
  if (!postMediaUrl) return invalidRenderMedia();

  const sourceText = normalizeText(post.title, post.content, 180);
  const info = professionalInfo(post.author);
  const target: ShareRenderTarget = {
    ...info,
    cardLabel: "Postado na Lectum",
    fileName: buildShareFileName(info.professionalName, sourceText),
    mediaUrl: postMediaUrl,
    postId: post.id,
    replyId: null,
    responseText: normalizeText(post.content, "Conteúdo profissional", 180),
    sourceText,
  };
  const source = await resolveShareRenderSourceUrl(target, post.author.id);
  return source ? { ...target, ...source } : invalidRenderMedia();
};

const isResolvedTarget = (
  value: Awaited<ReturnType<typeof resolveShareRenderTarget>>,
): value is ResolvedShareRenderTarget =>
  !(typeof value === "object" && value !== null && "success" in value && value.success === false);

export const renderShareArtifact = async (data: IPostRenderShareArtifactDTO): Promise<Resolve> =>
  startRenderShareArtifactJob(data);

export const startResolvedShareRenderArtifactJob = async (input: {
  ownerId: string;
  target: ResolvedShareRenderTarget;
}): Promise<Resolve> => {
  const { ownerId, target } = input;

  const response = await requestVideoServiceForJobStart("/api/private/jobs/social-share", {
    body: JSON.stringify({
      metadata: {
        cardLabel: target.cardLabel,
        professionalName: target.professionalName,
        professionalRoleLabel: target.professionalRoleLabel,
        professionalVerified: target.professionalVerified,
        responseText: target.responseText,
        sourceText: target.sourceText,
      },
      source_origin: target.sourceOrigin,
      source_url: target.sourceUrl,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response?.ok) return mapVideoServiceFailure(response);

  const envelope = await readVideoServiceEnvelope(response);
  if (envelope?.success !== true || !isVideoJobData(envelope.data)) return renderUnavailable();

  const handle = createShareRenderJobHandle(
    envelope.data.job_id,
    targetJobScope(ownerId, target),
    getJwtSecret(),
  );
  if (!handle) return renderUnavailable();
  return jobResponse(response.status, envelope.data, handle);
};

export const startRenderShareArtifactJob = async (
  data: IPostRenderShareArtifactJobDTO,
): Promise<Resolve> => {
  const target = await resolveShareRenderTarget(data);
  if (!isResolvedTarget(target)) return target;

  return startResolvedShareRenderArtifactJob({ ownerId: data.auth.id ?? "", target });
};

export const getResolvedShareRenderArtifactJob = async (input: {
  jobId?: string | null;
  ownerId: string;
  target: ResolvedShareRenderTarget;
}): Promise<Resolve> => {
  const handle = input.jobId?.trim() || "";
  const jobId = resolveShareRenderJobId(
    handle,
    targetJobScope(input.ownerId, input.target),
    getJwtSecret(),
  );
  if (!jobId) return invalidRenderTarget(404);

  const response = await requestVideoService(`/api/private/jobs/${encodeURIComponent(jobId)}`, {
    method: "GET",
  });

  if (!response?.ok) return mapVideoServiceFailure(response);

  const envelope = await readVideoServiceEnvelope(response);
  if (envelope?.success !== true || !isVideoJobData(envelope.data)) return renderUnavailable();

  if (envelope.data.job_id !== jobId) return renderUnavailable();
  return jobResponse(response.status, envelope.data, handle);
};

export const getRenderShareArtifactJob = async (
  data: IPostRenderShareArtifactJobDTO,
): Promise<Resolve> => {
  const target = await resolveShareRenderTarget(data);
  if (!isResolvedTarget(target)) return target;

  return getResolvedShareRenderArtifactJob({
    jobId: data.p.jobId,
    ownerId: data.auth.id ?? "",
    target,
  });
};

const fileHeaders = (target: ShareRenderTarget, response: Response) => {
  const headers: Record<string, string> = {
    "Accept-Ranges": response.headers.get("accept-ranges") ?? "bytes",
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Disposition": `attachment; filename="${target.fileName}"`,
    "Content-Type": "video/mp4",
    "X-Content-Type-Options": "nosniff",
  };

  for (const header of ["content-length", "content-range"] as const) {
    const value = response.headers.get(header);
    if (value) headers[header] = value;
  }

  return headers;
};

export const getResolvedShareRenderArtifactJobFile = async (input: {
  jobId?: string | null;
  ownerId: string;
  range?: string;
  target: ResolvedShareRenderTarget;
}): Promise<RenderShareArtifactJobFileResult> => {
  const handle = input.jobId?.trim() || "";
  const jobId = resolveShareRenderJobId(
    handle,
    targetJobScope(input.ownerId, input.target),
    getJwtSecret(),
  );
  if (!jobId) return invalidRenderTarget(404);

  const requestInit: RequestInit = { method: "GET" };
  if (input.range) {
    requestInit.headers = { Range: input.range };
  }

  const response = await requestVideoService(
    `/api/private/jobs/${encodeURIComponent(jobId)}/output`,
    requestInit,
    VIDEO_SERVICE_FILE_TIMEOUT_MS,
  );

  if (!response?.ok || !response.body) return mapVideoServiceFailure(response);

  return {
    body: response.body,
    headers: fileHeaders(input.target, response),
    kind: "file",
    status: response.status,
  };
};

export const getRenderShareArtifactJobFile = async (
  data: IPostRenderShareArtifactJobDTO,
): Promise<RenderShareArtifactJobFileResult> => {
  const target = await resolveShareRenderTarget(data);
  if (!isResolvedTarget(target)) return target;

  return getResolvedShareRenderArtifactJobFile({
    jobId: data.p.jobId,
    ownerId: data.auth.id ?? "",
    range: data.range,
    target,
  });
};

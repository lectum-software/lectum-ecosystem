import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import prisma from "@/infra/database/prisma";
import { getVideoProcessingServiceConfig } from "@/infra/video-processing";
import {
  getVideoStreamProvider,
  isCloudflareStreamVideoUid,
  videoAssetIdFromReference,
} from "@/infra/video-stream";
import { VideoAssetRepository } from "@/modules/video-assets/repository";
import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import { publicFileKeyFromUrl, publicFileUrl } from "@/utils/public-origin";
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

const VIDEO_SERVICE_FILE_TIMEOUT_MS = 390_000;
const POST_MEDIA_PREFIXES = ["posts/media/"] as const;
const JOB_ID_PATTERN = /^[a-z][a-z0-9]{23,31}$/;

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

type ShareRenderTarget = {
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

const requestVideoService = async (
  path: string,
  init: RequestInit = {},
  timeoutMs?: number,
): Promise<Response | null> => {
  const config = getVideoProcessingServiceConfig();
  if (!config) return null;

  try {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${config.apiKey}`);

    return await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(timeoutMs ?? config.requestTimeoutMs),
    });
  } catch {
    return null;
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
    JOB_ID_PATTERN.test(data.job_id) &&
    typeof data.status === "string" &&
    ["queued", "processing", "completed", "failed", "cancel_requested", "canceled"].includes(
      data.status,
    ) &&
    typeof data.progress === "number"
  );
};

const jobResponse = (status: number, data: VideoServiceJobData): Resolve => ({
  status,
  ...msg("post_share_artifact_rendered", {}),
  data,
});

const mapVideoServiceFailure = async (response: Response | null): Promise<Resolve> => {
  if (!response) return renderUnavailable();

  const envelope = await readVideoServiceEnvelope(response);
  const code = typeof envelope?.code === "string" ? envelope.code : null;

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

const normalizeText = (value: string | null | undefined, fallback: string, maxLength: number) => {
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

const buildShareFileName = (professionalName: string, sourceText: string) => {
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

const absoluteLegacyMediaSourceUrl = (mediaUrl: string) => {
  const key = publicFileKeyFromUrl(mediaUrl, POST_MEDIA_PREFIXES);
  if (!key) return null;

  const sourceUrl = publicFileUrl(key);
  try {
    const parsed = new URL(sourceUrl);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
};

const streamMediaSourceUrl = async (mediaUrl: string, ownerId: string) => {
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

  return provider.createPlayback(asset.provider_uid).hlsUrl;
};

const resolveSourceUrl = async (target: ShareRenderTarget, ownerId: string) =>
  (await streamMediaSourceUrl(target.mediaUrl, ownerId)) ??
  absoluteLegacyMediaSourceUrl(target.mediaUrl);

const postTargetSelect = {
  id: true,
  title: true,
  content: true,
  media_url: true,
  media_type: true,
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
): Promise<Resolve | (ShareRenderTarget & { sourceUrl: string })> => {
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
      cardLabel: "Perguntaram na Lectum",
      fileName: buildShareFileName(info.professionalName, sourceText),
      mediaUrl: reply.media_url,
      postId: data.p.id,
      replyId: reply.id,
      responseText: normalizeText(reply.content, "Resposta profissional", 180),
      sourceText,
    };
    const sourceUrl = await resolveSourceUrl(target, reply.author.id);
    return sourceUrl ? { ...target, sourceUrl } : invalidRenderMedia();
  }

  const post = await prisma.community_post.findFirst({
    where: {
      deleted: false,
      id: data.p.id,
      status: "publicado",
    },
    select: postTargetSelect,
  });

  if (!post) return invalidRenderTarget(404);
  const forbidden = ensureOwnerPsychologistTarget(data, post.author);
  if (forbidden) return forbidden;
  if (post.media_type !== "video" || !post.media_url) return invalidRenderMedia();

  const sourceText = normalizeText(post.title, post.content, 180);
  const info = professionalInfo(post.author);
  const target: ShareRenderTarget = {
    ...info,
    cardLabel: "Postado na Lectum",
    fileName: buildShareFileName(info.professionalName, sourceText),
    mediaUrl: post.media_url,
    postId: post.id,
    replyId: null,
    responseText: normalizeText(post.content, "Conteúdo profissional", 180),
    sourceText,
  };
  const sourceUrl = await resolveSourceUrl(target, post.author.id);
  return sourceUrl ? { ...target, sourceUrl } : invalidRenderMedia();
};

const isResolvedTarget = (
  value: Awaited<ReturnType<typeof resolveShareRenderTarget>>,
): value is ShareRenderTarget & { sourceUrl: string } =>
  !(typeof value === "object" && value !== null && "success" in value && value.success === false);

export const renderShareArtifact = async (data: IPostRenderShareArtifactDTO): Promise<Resolve> =>
  startRenderShareArtifactJob(data);

export const startRenderShareArtifactJob = async (
  data: IPostRenderShareArtifactJobDTO,
): Promise<Resolve> => {
  const target = await resolveShareRenderTarget(data);
  if (!isResolvedTarget(target)) return target;

  const response = await requestVideoService("/api/private/jobs/social-share", {
    body: JSON.stringify({
      metadata: {
        cardLabel: target.cardLabel,
        professionalName: target.professionalName,
        professionalRoleLabel: target.professionalRoleLabel,
        professionalVerified: target.professionalVerified,
        responseText: target.responseText,
        sourceText: target.sourceText,
      },
      source_url: target.sourceUrl,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response?.ok) return mapVideoServiceFailure(response);

  const envelope = await readVideoServiceEnvelope(response);
  if (envelope?.success !== true || !isVideoJobData(envelope.data)) return renderUnavailable();

  return jobResponse(response.status, envelope.data);
};

export const getRenderShareArtifactJob = async (
  data: IPostRenderShareArtifactJobDTO,
): Promise<Resolve> => {
  const target = await resolveShareRenderTarget(data);
  if (!isResolvedTarget(target)) return target;

  const jobId = data.p.jobId?.trim() || "";
  if (!JOB_ID_PATTERN.test(jobId)) return invalidRenderTarget(404);

  const response = await requestVideoService(`/api/private/jobs/${encodeURIComponent(jobId)}`, {
    method: "GET",
  });

  if (!response?.ok) return mapVideoServiceFailure(response);

  const envelope = await readVideoServiceEnvelope(response);
  if (envelope?.success !== true || !isVideoJobData(envelope.data)) return renderUnavailable();

  return jobResponse(response.status, envelope.data);
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

export const getRenderShareArtifactJobFile = async (
  data: IPostRenderShareArtifactJobDTO,
): Promise<RenderShareArtifactJobFileResult> => {
  const target = await resolveShareRenderTarget(data);
  if (!isResolvedTarget(target)) return target;

  const jobId = data.p.jobId?.trim() || "";
  if (!JOB_ID_PATTERN.test(jobId)) return invalidRenderTarget(404);

  const requestInit: RequestInit = { method: "GET" };
  if (data.range) {
    requestInit.headers = { Range: data.range };
  }

  const response = await requestVideoService(
    `/api/private/jobs/${encodeURIComponent(jobId)}/output`,
    requestInit,
    VIDEO_SERVICE_FILE_TIMEOUT_MS,
  );

  if (!response?.ok || !response.body) return mapVideoServiceFailure(response);

  return {
    body: response.body,
    headers: fileHeaders(target, response),
    kind: "file",
    status: response.status,
  };
};

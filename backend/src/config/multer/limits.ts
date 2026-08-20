import { parsePositiveInteger } from "@/utils/runtime-config";

type UploadLimitEnvironment = Partial<
  Pick<
    NodeJS.ProcessEnv,
    | "UPLOAD_LIMIT_ADMIN_SEO_OG_IMAGE_MB"
    | "UPLOAD_LIMIT_ADMIN_COMMUNITY_AVATAR_MB"
    | "UPLOAD_LIMIT_COMMUNITY_POST_MEDIA_MB"
    | "UPLOAD_LIMIT_PATIENT_AVATAR_MB"
    | "UPLOAD_LIMIT_POST_REPLY_MEDIA_MULTIPART_CHUNK_MB"
    | "UPLOAD_LIMIT_POST_REPLY_MEDIA_MULTIPART_MB"
    | "UPLOAD_LIMIT_POST_REPLY_MEDIA_SIMPLE_MB"
    | "UPLOAD_LIMIT_PSYCHOLOGIST_AVATAR_MB"
    | "UPLOAD_LIMIT_PSYCHOLOGIST_COVER_IMAGE_MB"
    | "UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_COVER_MB"
    | "UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_MULTIPART_CHUNK_MB"
    | "UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_MULTIPART_MB"
    | "UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_SIMPLE_MB"
  >
>;

const IMAGE_LIMIT_MAX_MB = 100;
const SINGLE_REQUEST_LIMIT_MAX_MB = 500;
const MULTIPART_TOTAL_LIMIT_MAX_MB = 5 * 1024;
const MULTIPART_LIMIT_MIN_MB = 5;
const MULTIPART_CHUNK_LIMIT_MAX_MB = 50;
const MULTIPART_CHUNK_LIMIT_MIN_MB = 5;

// O Busboy dispara alguns limites quando o valor configurado e alcancado,
// nao apenas quando ele e ultrapassado. O threshold interno precisa ficar
// uma unidade acima do maximo de produto para manter a regra publica inclusiva.
export const toMulterExclusiveThreshold = (inclusiveLimit: number) => inclusiveLimit + 1;

const imageLimit = (value: unknown, fallback = 5) =>
  parsePositiveInteger(value, fallback, { max: IMAGE_LIMIT_MAX_MB });

const singleRequestLimit = (value: unknown, fallback: number) =>
  parsePositiveInteger(value, fallback, { max: SINGLE_REQUEST_LIMIT_MAX_MB });

const multipartCompatibleSimpleLimit = (value: unknown, fallback: number) =>
  parsePositiveInteger(value, fallback, {
    max: SINGLE_REQUEST_LIMIT_MAX_MB,
    min: MULTIPART_LIMIT_MIN_MB,
  });

const multipartTotalLimit = (value: unknown, fallback: number) =>
  parsePositiveInteger(value, fallback, {
    max: MULTIPART_TOTAL_LIMIT_MAX_MB,
    min: MULTIPART_LIMIT_MIN_MB,
  });

const multipartChunkLimit = (value: unknown, fallback = 10) =>
  parsePositiveInteger(value, fallback, {
    max: MULTIPART_CHUNK_LIMIT_MAX_MB,
    min: MULTIPART_CHUNK_LIMIT_MIN_MB,
  });

export const resolveUploadLimits = (env: UploadLimitEnvironment = process.env) => ({
  admin: {
    seoOgImageMb: imageLimit(env.UPLOAD_LIMIT_ADMIN_SEO_OG_IMAGE_MB),
  },
  community: {
    avatarMb: imageLimit(env.UPLOAD_LIMIT_ADMIN_COMMUNITY_AVATAR_MB),
    postMediaMb: singleRequestLimit(env.UPLOAD_LIMIT_COMMUNITY_POST_MEDIA_MB, 200),
  },
  patient: {
    avatarMb: imageLimit(env.UPLOAD_LIMIT_PATIENT_AVATAR_MB),
  },
  postReply: {
    multipartChunkMb: multipartChunkLimit(env.UPLOAD_LIMIT_POST_REPLY_MEDIA_MULTIPART_CHUNK_MB),
    multipartTotalMb: multipartTotalLimit(env.UPLOAD_LIMIT_POST_REPLY_MEDIA_MULTIPART_MB, 200),
    simpleMb: multipartCompatibleSimpleLimit(env.UPLOAD_LIMIT_POST_REPLY_MEDIA_SIMPLE_MB, 200),
  },
  psychologist: {
    avatarMb: imageLimit(env.UPLOAD_LIMIT_PSYCHOLOGIST_AVATAR_MB),
    coverImageMb: imageLimit(env.UPLOAD_LIMIT_PSYCHOLOGIST_COVER_IMAGE_MB),
    videoCoverMb: imageLimit(env.UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_COVER_MB),
    videoMultipartChunkMb: multipartChunkLimit(
      env.UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_MULTIPART_CHUNK_MB,
    ),
    videoMultipartTotalMb: multipartTotalLimit(
      env.UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_MULTIPART_MB,
      300,
    ),
    videoSimpleMb: multipartCompatibleSimpleLimit(
      env.UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_SIMPLE_MB,
      50,
    ),
  },
});

export const UPLOAD_LIMITS = resolveUploadLimits();

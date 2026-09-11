import { createHmac, timingSafeEqual } from "node:crypto";

export const SHARE_RENDER_JOB_ID_PATTERN = /^[a-z][a-z0-9]{23,31}$/;
const SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

type ShareRenderJobScope = {
  ownerId: string;
  postId: string;
  replyId?: string | null;
};

const signatureFor = (jobId: string, scope: ShareRenderJobScope, key: string) =>
  createHmac("sha256", key)
    .update(
      JSON.stringify([
        "lectum:share-render-job:v1",
        jobId,
        scope.ownerId,
        scope.postId,
        scope.replyId || null,
      ]),
    )
    .digest("base64url");

// Um job do serviço interno não é autorização. O handle opaco só é emitido na criação.
export const createShareRenderJobHandle = (
  jobId: string,
  scope: ShareRenderJobScope,
  key: string,
): string | null => {
  if (!SHARE_RENDER_JOB_ID_PATTERN.test(jobId) || !scope.ownerId || !scope.postId || !key)
    return null;
  return `${jobId}.${signatureFor(jobId, scope, key)}`;
};

export const resolveShareRenderJobId = (
  handle: string,
  scope: ShareRenderJobScope,
  key: string,
): string | null => {
  if (handle.length > 120) return null;
  const [jobId, signature, extra] = handle.split(".");
  if (!jobId || !signature || extra !== undefined || !SIGNATURE_PATTERN.test(signature))
    return null;
  const expected = createShareRenderJobHandle(jobId, scope, key)?.split(".")[1];
  if (!expected || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return jobId;
};

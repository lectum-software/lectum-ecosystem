import { getApiErrorStatus } from "@/api/errors";
import { callEndpoint } from "@/api/generator";
import { handleReq } from "@/api/handle";
import {
  type AcceptLegalPayload,
  currentLegalSchema,
  fullPublishedDocSchema,
  legalDocumentIdSchema,
  legalStatusSchema,
} from "./types";

// A missing endpoint during independent rollout is unavailable, not configured or accepted.
const legalGet = async (route: string, params?: { id: string }) => {
  try {
    return await handleReq<unknown>({
      ...callEndpoint({ route, params, method: "GET" }),
      hideError: true,
    });
  } catch (error) {
    if (getApiErrorStatus(error) === 404) return null;
    throw error;
  }
};

export const currentLegal = async () => {
  const data = await legalGet("/api/public/legal/current");
  return data === null ? null : currentLegalSchema.parse(data);
};

export const publishedLegalDocument = async (id: string) => {
  if (!legalDocumentIdSchema.safeParse(id).success) return null;
  const data = await legalGet("/api/public/legal/documents/:id", { id });
  return data === null ? null : fullPublishedDocSchema.parse(data);
};

export const legalStatus = async () => {
  const data = await legalGet("/api/private/legal/status");
  return data === null ? null : legalStatusSchema.parse(data);
};

export const acceptLegal = async (body: AcceptLegalPayload) => {
  const data = await handleReq<unknown>({
    ...callEndpoint({ route: "/api/private/legal/accept", method: "POST", body }),
    hideError: true,
  });
  return legalStatusSchema.parse(data);
};

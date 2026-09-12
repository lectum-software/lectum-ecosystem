import "server-only";

import { cache } from "react";
import type { z } from "zod";
import { getPublicApiSource } from "@/utils/public-asset-sources";
import { currentLegalSchema, fullPublishedDocSchema, legalDocumentIdSchema } from "./types";

// Same SSR transport policy as lib/seo-metadata: validated API origin, timeout, no session.
const readPublished = async <T>(path: string, schema: z.ZodType<T>): Promise<T | null> => {
  try {
    const origin = getPublicApiSource()?.origin;
    if (!origin) return null;
    const response = await fetch(`${origin}${path}`, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: "application/json", "Accept-Language": "pt" },
    });
    if (!response.ok) return null;
    const envelope = (await response.json()) as { success?: boolean; data?: unknown };
    if (envelope?.success !== true) return null;
    const parsed = schema.safeParse(envelope.data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

// React cache deduplicates within the render only; never persists a published-version snapshot.
export const readCurrentLegal = cache(() =>
  readPublished("/api/public/legal/current", currentLegalSchema),
);

export const readPublishedLegalDocument = cache((id: string) => {
  if (!legalDocumentIdSchema.safeParse(id).success) return Promise.resolve(null);
  return readPublished(
    `/api/public/legal/documents/${encodeURIComponent(id)}`,
    fullPublishedDocSchema,
  );
});

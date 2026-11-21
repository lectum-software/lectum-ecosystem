import { z } from "zod";

export const oauthConsentReferenceSchema = z
  .object({
    sourceUrl: z.string().url().max(2048).optional(),
    tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
    documentVersion: z.string().min(1).max(256),
    preparedAt: z.number().int().positive(),
    expiresAt: z.number().int().positive(),
  })
  .strict();
export type OAuthConsentReference = z.infer<typeof oauthConsentReferenceSchema>;

export function readOAuthConsentReference(input: unknown, now = Date.now()) {
  const parsed = oauthConsentReferenceSchema.safeParse(input);
  if (!parsed.success) return null;
  const ref = parsed.data;
  return ref.preparedAt <= now &&
    ref.expiresAt > now &&
    ref.expiresAt > ref.preparedAt &&
    ref.expiresAt - ref.preparedAt <= 10 * 60_000
    ? ref
    : null;
}

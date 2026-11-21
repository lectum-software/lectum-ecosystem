import { z } from "zod";
import { buildConsentedMetaCapiPayload } from "./meta-capi";

const testContextSchema = z
  .object({
    environment: z.literal("local"),
    stripeMode: z.literal("test"),
    participant: z.literal("owner_test_account"),
    clientUserAgent: z
      .string()
      .min(1)
      .max(1024)
      .regex(/^[\x20-\x7E]+$/)
      .refine((value) => value.trim().length > 0),
  })
  .strict();

// Local preparation only. No token, environment, database or transport access.
// A valid preview does not approve an event or authorize external transmission.
export function prepareMetaTestPreview(
  testCode: unknown,
  evidence: Parameters<typeof buildConsentedMetaCapiPayload>[0],
  reviewedSourceUrls: readonly string[],
  reviewedDocumentVersion: string | null,
  nowMs: number,
  testContext: unknown,
) {
  const context = testContextSchema.safeParse(testContext);
  if (
    !context.success ||
    evidence.candidate.conversion !== "professional_subscription" ||
    !evidence.candidate.fbp ||
    evidence.candidate.fbc !== undefined
  )
    return null;
  if (typeof testCode !== "string" || !/^TEST[0-9]{1,20}$/.test(testCode)) return null;
  const payload = buildConsentedMetaCapiPayload(
    evidence,
    reviewedSourceUrls,
    reviewedDocumentVersion,
    nowMs,
  );
  if (!payload) return null;
  return {
    mode: "local_preview_only" as const,
    transmissionAllowed: false as const,
    payload: {
      data: payload.data.map((event) => ({
        ...event,
        user_data: { ...event.user_data, client_user_agent: context.data.clientUserAgent },
      })),
      test_event_code: testCode,
    },
  };
}

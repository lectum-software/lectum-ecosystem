import { z } from "zod";
import { buildConsentedMetaCapiPayload } from "./meta-capi";

const contextSchema = z
  .object({
    environment: z.literal("local"),
    participant: z.literal("owner_test_account"),
  })
  .strict();

// Pure preview: canonical source/consent resolution must precede this call.
// Neither a valid preview nor a test code authorizes a network request.
export function prepareRegistrationTestPreview(
  testCode: unknown,
  evidence: Parameters<typeof buildConsentedMetaCapiPayload>[0],
  reviewedSourceUrls: readonly string[],
  reviewedDocumentVersion: string | null,
  nowMs: number,
  context: unknown,
) {
  if (
    !contextSchema.safeParse(context).success ||
    typeof testCode !== "string" ||
    !/^TEST[0-9]{1,20}$/.test(testCode) ||
    evidence.candidate.conversion !== "professional_registration" ||
    !evidence.candidate.fbp ||
    evidence.candidate.fbc !== undefined ||
    evidence.candidate.amountCents !== undefined
  )
    return null;
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
    payload: { ...payload, test_event_code: testCode },
  };
}

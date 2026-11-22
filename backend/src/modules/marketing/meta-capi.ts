import { z } from "zod";
import { type AdvertisingConsent, hasAdvertisingConsent } from "./acquisition-policy";
import { CHECKOUT_SOURCE_URL } from "./checkout-policy";
import { metaBrowserIdSchema } from "./meta-browser-id";
import { readMetaConfig } from "./meta-config";
import { META_EVENT_POLICY, type MetaConversion, metaTransmissionDecision } from "./meta-policy";
import { marketingIpSchema, marketingUserAgentSchema } from "./request-context";
import { isUserConversion, USER_DELIVERY_POLICY, type UserConversion } from "./user-events";

export type ReviewedUserSourceUrls = Partial<Record<UserConversion, readonly string[]>>;

const candidateSchema = z
  .object({
    conversion: z.enum([
      "patient_registration",
      "patient_contact",
      "patient_community_post",
      "professional_registration",
      "professional_checkout",
      "professional_subscription",
    ]),
    eventId: z.string().regex(/^[a-f0-9]{64}$/),
    occurredAt: z.number().int().positive(),
    sourceUrl: z.string().url(),
    fbc: z
      .string()
      .regex(/^fb\.\d+\.\d{13}\.[A-Za-z0-9_-]{1,512}$/)
      .optional(),
    fbp: metaBrowserIdSchema.optional(),
    clientUserAgent: marketingUserAgentSchema.optional(),
    clientIpAddress: marketingIpSchema.optional(),
    amountCents: z.number().int().positive().max(100_000_000).optional(),
  })
  .strict();

export type MetaCapiCandidate = z.infer<typeof candidateSchema>;

// Pure serializer, not an approval or a send operation. URL/identifiers must be
// separately reviewed. No request body, profile, UTM, referrer or form is spread.
export function buildMetaCapiPayload(
  input: unknown,
  reviewedSourceUrls: readonly string[],
  nowSeconds: number,
  reviewedUserSourceUrls: ReviewedUserSourceUrls = {},
) {
  const parsed = candidateSchema.safeParse(input);
  if (!parsed.success || !Number.isFinite(nowSeconds)) return null;
  const item = parsed.data;
  const source = new URL(item.sourceUrl);
  if (
    source.protocol !== "https:" ||
    source.username ||
    source.password ||
    source.search ||
    source.hash ||
    !reviewedSourceUrls.includes(item.sourceUrl) ||
    (isUserConversion(item.conversion) &&
      !reviewedUserSourceUrls[item.conversion]?.includes(item.sourceUrl)) ||
    item.occurredAt > nowSeconds ||
    nowSeconds - item.occurredAt > 7 * 86400 ||
    (!item.fbc && !item.fbp) ||
    (item.conversion === "professional_subscription"
      ? !item.amountCents
      : item.amountCents !== undefined)
  )
    return null;
  const customData:
    | { value: number; currency: string }
    | { account_type: "user" | "professional" }
    | undefined =
    item.conversion === "professional_subscription"
      ? { value: item.amountCents! / 100, currency: "BRL" }
      : item.conversion === "patient_registration"
        ? { account_type: "user" }
        : item.conversion === "professional_registration"
          ? { account_type: "professional" }
          : undefined;
  return {
    data: [
      {
        event_name: META_EVENT_POLICY[item.conversion].eventName,
        event_id: item.eventId,
        event_time: item.occurredAt,
        action_source: "website" as const,
        event_source_url: item.sourceUrl,
        user_data: {
          ...(item.clientUserAgent ? { client_user_agent: item.clientUserAgent } : {}),
          ...(item.clientIpAddress ? { client_ip_address: item.clientIpAddress } : {}),
          ...(item.fbc ? { fbc: item.fbc } : {}),
          ...(item.fbp ? { fbp: item.fbp } : {}),
        },
        ...(customData ? { custom_data: customData } : {}),
      },
    ],
  };
}

type DeliveryEvidence = {
  consent: AdvertisingConsent | null;
  candidate: MetaCapiCandidate;
  // Persisted business timestamp, before truncation to Meta's seconds.
  occurredAtMs: number;
};

export function buildConsentedMetaCapiPayload(
  evidence: DeliveryEvidence,
  reviewedSourceUrls: readonly string[],
  reviewedDocumentVersion: string | null,
  nowMs: number,
  reviewedUserSourceUrls: ReviewedUserSourceUrls = {},
) {
  if (
    !reviewedDocumentVersion ||
    evidence.consent?.documentVersion !== reviewedDocumentVersion ||
    !Number.isSafeInteger(evidence.occurredAtMs) ||
    evidence.occurredAtMs <= 0 ||
    evidence.occurredAtMs > nowMs ||
    Math.floor(evidence.occurredAtMs / 1000) !== evidence.candidate.occurredAt ||
    !hasAdvertisingConsent(evidence.consent, evidence.occurredAtMs) ||
    !hasAdvertisingConsent(evidence.consent, nowMs)
  )
    return null;
  return buildMetaCapiPayload(
    evidence.candidate,
    reviewedSourceUrls,
    Math.floor(nowMs / 1000),
    reviewedUserSourceUrls,
  );
}

type DeliveryInput = {
  conversion: MetaConversion;
  // This callback must read current SERVER consent and an already persisted event.
  // It is not invoked at all while transmission is blocked.
  resolve: () => Promise<DeliveryEvidence | null>;
};

// Reviewed professional registration and billing origins, including first paid subscription.
const REVIEWED_SOURCE_URLS: readonly string[] = ["https://www.lectum.com.br/", CHECKOUT_SOURCE_URL];
const REVIEWED_CONSENT_DOCUMENT_VERSION: string | null =
  "lectum-meta-measurement-2026-11-21-network-context";

export async function deliverMetaConversion(input: DeliveryInput) {
  try {
    const decision = metaTransmissionDecision(input.conversion);
    if (!decision.allowed) return { status: "blocked" as const, reason: decision.reason };
    const config = readMetaConfig();
    if (!config.enabled || !config.datasetId || !config.apiVersion || !config.token)
      return { status: "disabled" as const };
    const evidence = await input.resolve();
    if (!evidence || !hasAdvertisingConsent(evidence.consent, Date.now()))
      return { status: "blocked" as const, reason: "consent_required" };
    if (evidence.candidate.conversion !== input.conversion) return { status: "invalid" as const };
    const userConversion = isUserConversion(input.conversion);
    const body = buildConsentedMetaCapiPayload(
      evidence,
      userConversion ? Object.values(USER_DELIVERY_POLICY.sourceUrls).flat() : REVIEWED_SOURCE_URLS,
      userConversion ? USER_DELIVERY_POLICY.documentVersion : REVIEWED_CONSENT_DOCUMENT_VERSION,
      Date.now(),
      userConversion ? USER_DELIVERY_POLICY.sourceUrls : {},
    );
    if (!body?.data[0].user_data.client_user_agent) return { status: "invalid" as const };
    const response = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.datasetId}/events`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.timeout(2500),
      },
    );
    if (!response.ok) return { status: "failed" as const };
    const result: unknown = await response.json();
    return typeof result === "object" &&
      result !== null &&
      "events_received" in result &&
      result.events_received === 1
      ? { status: "sent" as const }
      : { status: "failed" as const };
  } catch {
    // Never leak provider bodies/tokens/identifiers or interrupt a product action.
    return { status: "failed" as const };
  }
}

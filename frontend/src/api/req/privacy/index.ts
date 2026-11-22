import { z } from "zod";
import { callEndpoint } from "@/api/generator";
import { handleReq } from "@/api/handle";
import { captureOptionalCheckout } from "@/components/privacy/checkout-capture";
import { PRIVACY_NOTICE_VERSION } from "@/components/privacy/policy";
import { hasLocalCampaignConsent } from "@/components/privacy/use-choice";

const statusSchema = z.object({
  purpose: z.literal("meta_ads_measurement"),
  revision: z.number().int().nonnegative(),
  granted: z.boolean(),
  decided: z.boolean().default(false),
  document_version: z.string().nullable(),
  collection_available: z.boolean(),
  expires_at: z.string().nullable(),
  external_transmission: z.literal(false),
});
export type PrivacyStatus = z.infer<typeof statusSchema>;

async function request(action: "status" | "grant" | "revoke", body?: object) {
  return statusSchema.parse(
    await handleReq<unknown>({
      ...callEndpoint({
        route: `/api/private/marketing/consent/${action}`,
        method: action === "status" ? "GET" : "POST",
        body,
      }),
      hideError: true,
    }),
  );
}
export const privacyStatus = () => request("status");
export const CHECKOUT_CONTEXT_CAPTURE_ENABLED = true;
export async function capturePrivacyCheckout(
  userId: string | null,
  operationId: string,
  entry = false,
) {
  if (!CHECKOUT_CONTEXT_CAPTURE_ENABLED || !userId) return;
  await captureOptionalCheckout({
    enabled: true,
    operationId,
    timeoutMs: entry ? 5000 : 1000,
    documentVersion: PRIVACY_NOTICE_VERSION,
    hasConsent: () => hasLocalCampaignConsent(userId),
    status: async (signal) =>
      statusSchema.parse(
        await handleReq<unknown>({
          ...callEndpoint({ route: "/api/private/marketing/consent/status", method: "GET" }),
          config: { signal },
          hideError: true,
          signOutOnUnauthorized: false,
        }),
      ),
    capture: async (body, signal) => {
      if (entry) await capturePrivacyBrowser(body.revision, body.documentVersion, signal);
      if (signal.aborted || !hasLocalCampaignConsent(userId)) return;
      return handleReq<unknown>({
        ...callEndpoint({
          route: entry
            ? "/api/private/marketing/consent/checkout-entry"
            : "/api/private/marketing/consent/checkout",
          method: "POST",
          body: entry ? { revision: body.revision, documentVersion: body.documentVersion } : body,
        }),
        config: { signal },
        hideError: true,
        signOutOnUnauthorized: false,
      });
    },
  });
}
export const capturePrivacyCheckoutEntry = (userId: string | null) =>
  capturePrivacyCheckout(userId, "entry", true);
export const revokePrivacy = () => request("revoke");
export const BROWSER_IDENTIFIER_CAPTURE_ENABLED = true;
export async function capturePrivacyBrowser(
  expected_revision: number,
  document_version: string,
  signal?: AbortSignal,
) {
  if (!BROWSER_IDENTIFIER_CAPTURE_ENABLED) return;
  await handleReq<unknown>({
    ...callEndpoint({
      route: "/api/private/marketing/consent/browser",
      method: "POST",
      body: { expected_revision, document_version },
    }),
    config: { signal },
    hideError: true,
    signOutOnUnauthorized: false,
  });
}
export const grantPrivacy = (body: {
  accepted: true;
  document_version: string;
  expected_revision: number;
  guest_token?: string;
  authorize_transfer?: true;
}) => request("grant", body);

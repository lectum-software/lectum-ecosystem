import { Router } from "express";
import { z } from "zod";
import { send } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { AttributionRepository } from "@/modules/marketing/attribution-repository";
import {
  browserCookieName,
  browserCookieOptions,
  clearBrowserCookie,
} from "@/modules/marketing/browser-cookie";
import {
  BROWSER_IDENTIFIER_POLICY,
  type BrowserIdentifierPolicy,
} from "@/modules/marketing/browser-identifier-repository";
import {
  MARKETING_CONSENT_POLICY,
  MarketingConsentError,
  type MarketingConsentPolicy,
} from "@/modules/marketing/consent-policy";
import { pixelReceipts } from "@/modules/marketing/pixel-controller";

export const campaignSchema = z
  .object({
    utm_source: z.string().max(128).optional(),
    utm_medium: z.string().max(128).optional(),
    utm_campaign: z.string().max(128).optional(),
    utm_content: z.string().max(128).optional(),
    utm_term: z.string().max(128).optional(),
  })
  .strict();
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
const captureSchema = z
  .object({
    token: tokenSchema,
    accepted: z.literal(true),
    document_version: z.string().max(160),
    campaigns: campaignSchema,
  })
  .strict();

export function createAttributionRouter(
  policy: MarketingConsentPolicy = MARKETING_CONSENT_POLICY,
  now = () => new Date(),
  browserPolicy: BrowserIdentifierPolicy = BROWSER_IDENTIFIER_POLICY,
) {
  const router = Router();
  router.post("/pixel-events", (req, res) => pixelReceipts(req, res, null));
  const repo = new AttributionRepository(policy, browserPolicy);
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  router.post("/capture", async (req, res) => {
    // Disabled before parsing or retaining input. No environment variable overrides this gate.
    if (!policy.acquisitionEnabled)
      return send(res, {
        status: 200,
        ...msg("marketing_consent_saved"),
        data: { enabled: false },
      });
    try {
      const input = captureSchema.parse(req.body);
      const result = await repo.captureGuest(input, now());
      if (browserPolicy.enabled && "browserExpiresAt" in result && result.browserExpiresAt)
        res.cookie(browserCookieName, input.token, {
          ...browserCookieOptions,
          expires: result.browserExpiresAt,
        });
      return send(res, {
        status: 200,
        ...msg("marketing_consent_saved"),
        data: {
          enabled: result.enabled,
          expires_at: "expires_at" in result ? result.expires_at : null,
        },
      });
    } catch (err) {
      // Never log the request, bearer token or campaign values.
      return send(res, {
        status: err instanceof MarketingConsentError ? err.status : 400,
        ...error("marketing_consent_invalid"),
      });
    }
  });
  router.post("/revoke", async (req, res) => {
    try {
      const { token } = z.object({ token: tokenSchema }).strict().parse(req.body);
      await repo.revokeGuest(token);
      clearBrowserCookie(res);
      return send(res, { status: 200, ...msg("marketing_consent_saved"), data: { revoked: true } });
    } catch {
      return send(res, { status: 400, ...error("marketing_consent_invalid") });
    }
  });
  return router;
}
export default createAttributionRouter();

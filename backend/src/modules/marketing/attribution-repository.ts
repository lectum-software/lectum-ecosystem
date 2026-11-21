import { createHash } from "node:crypto";
import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { permittedCampaignAttribution } from "./acquisition-policy";
import {
  BROWSER_IDENTIFIER_POLICY,
  type BrowserIdentifierPolicy,
  createBrowserEvidence,
} from "./browser-identifier-repository";
import {
  MARKETING_CONSENT_POLICY,
  MarketingConsentError,
  type MarketingConsentPolicy,
} from "./consent-policy";

export const PRE_SIGNUP_RETENTION_MS = 30 * 24 * 60 * 60_000;
export const POST_SIGNUP_RETENTION_MS = 90 * 24 * 60 * 60_000;
export function attributionTokenHash(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new MarketingConsentError("marketing_consent_invalid", 400);
  return createHash("sha256").update(token).digest("hex");
}
function approved(input: Record<string, unknown>, policy: MarketingConsentPolicy, now: Date) {
  return permittedCampaignAttribution(
    input,
    policy.campaigns,
    {
      purpose: "meta_ads_measurement",
      documentVersion: policy.documentVersion!,
      grantedAt: now.getTime(),
      expiresAt: now.getTime() + 1,
      revokedAt: null,
    },
    now.getTime(),
  );
}
export async function purgeExpiredAttribution(now = new Date()) {
  await prisma.$transaction([
    prisma.marketing_checkout_context.deleteMany({ where: { expires_at: { lte: now } } }),
    prisma.marketing_browser_identifier.deleteMany({
      where: {
        OR: [
          { expires_at: { lte: now } },
          { consent: { revoked_at: { not: null } } },
          { consent: { expires_at: { lte: now } } },
        ],
      },
    }),
    prisma.marketing_guest_attribution.deleteMany({ where: { expires_at: { lte: now } } }),
    prisma.marketing_attribution.deleteMany({
      where: {
        OR: [
          { expires_at: { lte: now } },
          { consent: { expires_at: { lte: now } } },
          { consent: { revoked_at: { not: null } } },
        ],
      },
    }),
  ]);
}

export class AttributionRepository {
  constructor(
    private readonly policy: MarketingConsentPolicy = MARKETING_CONSENT_POLICY,
    private readonly browserPolicy: BrowserIdentifierPolicy = BROWSER_IDENTIFIER_POLICY,
  ) {}
  async captureGuest(
    input: {
      token: string;
      accepted: true;
      document_version: string;
      campaigns: Record<string, unknown>;
    },
    now = new Date(),
  ) {
    if (!this.policy.acquisitionEnabled) return { enabled: false as const };
    if (
      !this.policy.documentVersion ||
      input.accepted !== true ||
      input.document_version !== this.policy.documentVersion
    )
      throw new MarketingConsentError("marketing_consent_invalid", 400);
    const token_hash = attributionTokenHash(input.token);
    const campaigns = approved(input.campaigns, this.policy, now);
    return withSerializableTransaction(async (tx) => {
      const prior = await tx.marketing_guest_attribution.findUnique({ where: { token_hash } });
      if (
        prior &&
        (prior.revoked ||
          prior.claimed ||
          prior.expires_at <= now ||
          prior.document_version !== this.policy.documentVersion)
      )
        throw new MarketingConsentError("marketing_consent_conflict");

      const row = prior
        ? Object.keys(campaigns).length
          ? await tx.marketing_guest_attribution.update({
              where: { token_hash },
              data: { last_campaigns: campaigns, last_at: now },
            })
          : prior
        : await tx.marketing_guest_attribution.create({
            data: {
              token_hash,
              document_version: this.policy.documentVersion!,
              first_campaigns: campaigns,
              last_campaigns: campaigns,
              first_at: now,
              last_at: now,
              granted_at: now,
              expires_at: new Date(now.getTime() + PRE_SIGNUP_RETENTION_MS),
            },
          });
      let browserExpiresAt = row.browser_fbp ? row.expires_at : null;
      // Only new, consented visits in a reviewed context may create browser evidence.
      if (
        !prior &&
        this.browserPolicy.enabled &&
        this.browserPolicy.host &&
        (this.browserPolicy.anonymousCampaigns?.includes(String(campaigns.utm_campaign ?? "")) ||
          (this.browserPolicy.anonymousDirectVisits === true &&
            Object.keys(input.campaigns).length === 0))
      ) {
        const evidence = createBrowserEvidence(
          this.browserPolicy.host,
          row.granted_at,
          row.expires_at,
        );
        if (evidence) {
          browserExpiresAt = row.expires_at;
          await tx.marketing_guest_attribution.update({
            where: { token_hash },
            data: { browser_fbp: evidence.fbp, browser_captured_at: evidence.capturedAt },
          });
        }
      }
      return { enabled: true as const, expires_at: row.expires_at.toISOString(), browserExpiresAt };
    });
  }
  async revokeGuest(token: string) {
    const token_hash = attributionTokenHash(token);
    // Revocation remains available even if collection is subsequently disabled.
    await withSerializableTransaction(async (tx) => {
      const now = new Date();
      await tx.marketing_guest_attribution.upsert({
        where: { token_hash },
        update: {
          revoked: true,
          first_campaigns: {},
          last_campaigns: {},
          browser_fbp: null,
          browser_captured_at: null,
        },
        create: {
          token_hash,
          document_version: this.policy.documentVersion ?? "revoked",
          first_campaigns: {},
          last_campaigns: {},
          granted_at: now,
          first_at: now,
          last_at: now,
          expires_at: new Date(now.getTime() + PRE_SIGNUP_RETENTION_MS),
          revoked: true,
        },
      });
      // A user OAuth claim is the same grant, so guest revocation must also revoke its account copy.
      const linkedUserConsents = await tx.marketing_consent.findMany({
        where: {
          user: { role: "paciente" },
          revoked_at: null,
          attribution: { source_token_hash: token_hash },
        },
        select: { user_id: true, revision: true, document_version: true },
      });
      await tx.marketing_consent.updateMany({
        where: {
          user: { role: "paciente" },
          revoked_at: null,
          attribution: { source_token_hash: token_hash },
        },
        data: { revoked_at: now, revision: { increment: 1 } },
      });
      if (linkedUserConsents.length)
        await tx.marketing_consent_event.createMany({
          data: linkedUserConsents.map((consent) => ({
            user_id: consent.user_id,
            revision: consent.revision + 1,
            document_version: consent.document_version,
            action: "guest_revocation",
            created_at: now,
          })),
        });
      await tx.marketing_attribution.deleteMany({ where: { source_token_hash: token_hash } });
      await tx.marketing_browser_identifier.deleteMany({ where: { token_hash } });
    });
  }
  async transfer(
    tx: Prisma.TransactionClient,
    userId: string,
    revision: number,
    expiresAt: Date,
    token: string,
    now: Date,
  ) {
    if (!this.policy.acquisitionEnabled)
      throw new MarketingConsentError("marketing_consent_unavailable");
    const token_hash = attributionTokenHash(token);
    const source = await tx.marketing_guest_attribution.findUnique({ where: { token_hash } });
    const existing = await tx.marketing_attribution.findUnique({ where: { user_id: userId } });
    if (existing?.source_token_hash === token_hash && existing.consent_revision === revision)
      return;
    if (
      !source ||
      source.revoked ||
      source.claimed ||
      source.expires_at <= now ||
      source.document_version !== this.policy.documentVersion ||
      existing
    )
      throw new MarketingConsentError("marketing_consent_conflict");
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user?.active || user.deleted || user.role !== "psicologo")
      throw new MarketingConsentError("marketing_consent_invalid", 403);
    const first = approved(source.first_campaigns as Record<string, unknown>, this.policy, now);
    const last = approved(source.last_campaigns as Record<string, unknown>, this.policy, now);
    // Direct visits carry consent lineage even without campaign attribution.
    if (!Object.keys(first).length && Object.keys(source.first_campaigns as object).length)
      throw new MarketingConsentError("marketing_consent_invalid", 400);
    await tx.marketing_attribution.create({
      data: {
        user_id: userId,
        consent_revision: revision,
        campaigns: first,
        captured_at: source.first_at,
        source_consent_at: source.granted_at,
        last_campaigns: last,
        last_captured_at: source.last_at,
        source_token_hash: token_hash,
        expires_at: new Date(
          Math.min(expiresAt.getTime(), now.getTime() + POST_SIGNUP_RETENTION_MS),
        ),
      },
    });
    // Transfer only alongside the existing authorized campaign claim; never extend its lifetime.
    if (source.browser_fbp && source.browser_captured_at) {
      await tx.marketing_browser_identifier.create({
        data: {
          token_hash,
          user_id: userId,
          consent_revision: revision,
          fbp: source.browser_fbp,
          captured_at: source.browser_captured_at,
          expires_at: new Date(Math.min(expiresAt.getTime(), source.expires_at.getTime())),
        },
      });
    }
    await tx.marketing_guest_attribution.update({
      where: { token_hash },
      data: {
        claimed: true,
        browser_fbp: null,
        browser_captured_at: null,
        first_campaigns: {},
        last_campaigns: {},
      },
    });
  }
  async touchUser(
    userId: string,
    input: { expected_revision: number; campaigns: Record<string, unknown> },
    now = new Date(),
  ) {
    if (!this.policy.acquisitionEnabled) return;
    await withSerializableTransaction(async (tx) => {
      const consent = await tx.marketing_consent.findUnique({
        where: { user_id: userId },
        include: { user: true },
      });
      if (
        !consent ||
        consent.revoked_at ||
        !consent.expires_at ||
        consent.expires_at <= now ||
        consent.document_version !== this.policy.documentVersion ||
        consent.revision !== input.expected_revision ||
        !consent.user.active ||
        consent.user.deleted ||
        consent.user.role !== "psicologo"
      )
        return;
      const campaigns = approved(input.campaigns, this.policy, now);
      if (!Object.keys(campaigns).length) return;
      const existing = await tx.marketing_attribution.findUnique({ where: { user_id: userId } });
      if (
        existing &&
        (existing.consent_revision !== consent.revision ||
          (existing.expires_at && existing.expires_at <= now))
      )
        return;
      if (existing)
        await tx.marketing_attribution.update({
          where: { user_id: userId },
          data: { last_campaigns: campaigns, last_captured_at: now },
        });
      else
        await tx.marketing_attribution.create({
          data: {
            user_id: userId,
            consent_revision: consent.revision,
            campaigns,
            captured_at: now,
            last_campaigns: campaigns,
            last_captured_at: now,
            expires_at: new Date(
              Math.min(consent.expires_at.getTime(), now.getTime() + POST_SIGNUP_RETENTION_MS),
            ),
          },
        });
    });
  }
}

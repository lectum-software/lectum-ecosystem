import type { marketing_consent, Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { hasAdvertisingConsent, permittedCampaignAttribution } from "./acquisition-policy";
import { AttributionRepository, POST_SIGNUP_RETENTION_MS } from "./attribution-repository";
import {
  MARKETING_CONSENT_POLICY,
  MarketingConsentError,
  type MarketingConsentPolicy,
} from "./consent-policy";
import { registrationConsentLinked } from "./professional-events";

function evidence(row: marketing_consent | null) {
  return row?.granted_at && row.expires_at && row.document_version
    ? {
        purpose: "meta_ads_measurement" as const,
        documentVersion: row.document_version,
        grantedAt: row.granted_at.getTime(),
        expiresAt: row.expires_at.getTime(),
        revokedAt: row.revoked_at?.getTime() ?? null,
      }
    : null;
}

export async function consentedAcquisition(
  tx: Prisma.TransactionClient,
  userId: string,
  occurredAt: Date,
  now = new Date(),
  policy = MARKETING_CONSENT_POLICY,
) {
  const row = await tx.marketing_consent.findUnique({
    where: { user_id: userId },
    include: { attribution: true, user: { select: { active: true, deleted: true, role: true } } },
  });
  const consent = evidence(row);
  if (
    !row?.user.active ||
    row.user.deleted ||
    row.user.role !== "psicologo" ||
    !policy.documentVersion ||
    row.document_version !== policy.documentVersion ||
    !hasAdvertisingConsent(consent, now.getTime()) ||
    !hasAdvertisingConsent(consent, occurredAt.getTime()) ||
    !row.attribution ||
    row.attribution.consent_revision !== row.revision ||
    row.attribution.captured_at > occurredAt ||
    row.attribution.captured_at < (row.attribution.source_consent_at ?? row.granted_at!) ||
    (row.attribution.expires_at && row.attribution.expires_at <= now)
  )
    return null;
  const raw = row.attribution.campaigns;
  const campaigns = permittedCampaignAttribution(
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {},
    policy.campaigns,
    consent,
    now.getTime(),
  );
  if (!Object.keys(campaigns).length) return null;
  return { userId, revision: row.revision, documentVersion: row.document_version, campaigns };
}

export class MarketingConsentRepository {
  constructor(private readonly policy: MarketingConsentPolicy = MARKETING_CONSENT_POLICY) {}

  async status(userId: string, now = new Date()) {
    const row = await prisma.marketing_consent.findUnique({ where: { user_id: userId } });
    return this.publicStatus(row, now);
  }

  private publicStatus(row: marketing_consent | null, now: Date) {
    return {
      purpose: "meta_ads_measurement",
      revision: row?.revision ?? 0,
      decided: Boolean(
        row?.revoked_at ||
          (row?.document_version === this.policy.documentVersion &&
            hasAdvertisingConsent(evidence(row), now.getTime())),
      ),
      granted: Boolean(
        this.policy.documentVersion &&
          row?.document_version === this.policy.documentVersion &&
          hasAdvertisingConsent(evidence(row), now.getTime()),
      ),
      document_version: this.policy.documentVersion,
      collection_available: this.policy.documentVersion !== null,
      expires_at: row?.expires_at?.toISOString() ?? null,
      external_transmission: false,
    };
  }

  async grant(
    userId: string,
    input: {
      accepted: true;
      document_version: string;
      expected_revision: number;
      campaigns?: Record<string, unknown>;
      guest_token?: string;
      authorize_transfer?: true;
    },
    now = new Date(),
  ) {
    if (!this.policy.documentVersion)
      throw new MarketingConsentError("marketing_consent_unavailable");
    if (
      input.accepted !== true ||
      input.document_version !== this.policy.documentVersion ||
      !Number.isSafeInteger(input.expected_revision) ||
      input.expected_revision < 0
    )
      throw new MarketingConsentError("marketing_consent_invalid", 400);
    if (Boolean(input.guest_token) !== (input.authorize_transfer === true))
      throw new MarketingConsentError("marketing_consent_invalid", 400);
    return withSerializableTransaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: userId, active: true, deleted: false },
      });
      if (!user) throw new MarketingConsentError("marketing_consent_invalid", 403);
      await tx.marketing_consent.createMany({ data: [{ user_id: userId }], skipDuplicates: true });
      const row = await tx.marketing_consent.findUniqueOrThrow({ where: { user_id: userId } });
      if (row.revision !== input.expected_revision)
        throw new MarketingConsentError("marketing_consent_conflict");
      // Repeated affirmative input does not extend consent or overwrite first-touch attribution.
      if (this.publicStatus(row, now).granted) {
        if (input.guest_token) {
          await new AttributionRepository(this.policy).transfer(
            tx,
            userId,
            row.revision,
            row.expires_at!,
            input.guest_token,
            now,
          );
          await registrationConsentLinked(tx, userId, now);
        }
        return this.publicStatus(row, now);
      }
      const updated = await tx.marketing_consent.update({
        where: { user_id: userId },
        data: {
          revision: { increment: 1 },
          document_version: this.policy.documentVersion,
          granted_at: now,
          expires_at: new Date(now.getTime() + this.policy.maxAgeMs),
          revoked_at: null,
        },
      });
      await tx.marketing_browser_identifier.deleteMany({ where: { user_id: userId } });
      await tx.marketing_delivery_job.deleteMany({ where: { user_id: userId } });
      await tx.marketing_consent_event.create({
        data: {
          user_id: userId,
          revision: updated.revision,
          action: "granted",
          document_version: updated.document_version,
          created_at: now,
        },
      });
      await tx.marketing_attribution.deleteMany({ where: { user_id: userId } });
      if (input.guest_token) {
        await new AttributionRepository(this.policy).transfer(
          tx,
          userId,
          updated.revision,
          updated.expires_at!,
          input.guest_token,
          now,
        );
        await registrationConsentLinked(tx, userId, now);
        return this.publicStatus(updated, now);
      }
      const campaigns = permittedCampaignAttribution(
        input.campaigns ?? {},
        this.policy.campaigns,
        evidence(updated),
        now.getTime(),
      );
      if (Object.keys(campaigns).length)
        await tx.marketing_attribution.create({
          data: {
            user_id: userId,
            consent_revision: updated.revision,
            campaigns,
            captured_at: now,
            last_campaigns: campaigns,
            last_captured_at: now,
            expires_at: new Date(
              Math.min(updated.expires_at!.getTime(), now.getTime() + POST_SIGNUP_RETENTION_MS),
            ),
          },
        });
      return this.publicStatus(updated, now);
    });
  }

  async revoke(userId: string, now = new Date()) {
    return withSerializableTransaction(async (tx) => {
      if (!(await tx.user.findUnique({ where: { id: userId } })))
        throw new MarketingConsentError("marketing_consent_invalid", 403);
      await tx.marketing_consent.createMany({ data: [{ user_id: userId }], skipDuplicates: true });
      const row = await tx.marketing_consent.findUniqueOrThrow({ where: { user_id: userId } });
      await tx.marketing_attribution.deleteMany({ where: { user_id: userId } });
      await tx.marketing_browser_identifier.deleteMany({ where: { user_id: userId } });
      await tx.marketing_delivery_job.deleteMany({ where: { user_id: userId } });
      if (row.revoked_at) return this.publicStatus(row, now);
      const updated = await tx.marketing_consent.update({
        where: { user_id: userId },
        data: { revision: { increment: 1 }, revoked_at: now },
      });
      await tx.marketing_consent_event.create({
        data: {
          user_id: userId,
          revision: updated.revision,
          action: "revoked",
          document_version: updated.document_version,
          created_at: now,
        },
      });
      return this.publicStatus(updated, now);
    });
  }
}

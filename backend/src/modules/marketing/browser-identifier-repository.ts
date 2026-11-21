import { createHash, randomBytes } from "node:crypto";
import { ParamBuilder } from "capi-param-builder-nodejs";
import type { Prisma } from "@/external/generated/prisma/client";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { hasAdvertisingConsent } from "./acquisition-policy";
import { browserIdWithinConsent, isMetaBrowserId } from "./meta-browser-id";

export type BrowserIdentifierPolicy = {
  enabled: boolean;
  host: string | null;
  anonymousCampaigns?: readonly string[];
  anonymousDirectVisits?: boolean;
};
export const BROWSER_IDENTIFIER_POLICY: BrowserIdentifierPolicy = {
  enabled: true,
  host: "www.lectum.com.br",
  anonymousCampaigns: [],
  anonymousDirectVisits: true,
};
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const validToken = (token: unknown): token is string =>
  typeof token === "string" && /^[a-f0-9]{64}$/.test(token);

export async function readBrowserIdentifier(
  tx: Prisma.TransactionClient,
  userId: string,
  token: string,
  revision: number,
  documentVersion: string,
  now: Date,
) {
  if (!validToken(token)) return null;
  return readStoredBrowserIdentifier(tx, userId, hash(token), revision, documentVersion, now);
}

// Worker-only lookup from a persisted checkout reference, never a request parameter.
export async function readStoredBrowserIdentifier(
  tx: Prisma.TransactionClient,
  userId: string,
  tokenHash: string,
  revision: number,
  documentVersion: string,
  now: Date,
) {
  if (!validToken(tokenHash)) return null;
  const row = await tx.marketing_browser_identifier.findUnique({
    where: { token_hash: tokenHash },
  });
  const consent = await tx.marketing_consent.findUnique({
    where: { user_id: userId },
    include: { user: { select: { role: true, active: true, deleted: true } } },
  });
  let consentStart = consent?.granted_at;
  if (row && consentStart && row.captured_at < consentStart) {
    const acquisition = await tx.marketing_attribution.findUnique({ where: { user_id: userId } });
    const guest = await tx.marketing_guest_attribution.findUnique({
      where: { token_hash: row.token_hash },
    });
    if (
      !guest?.claimed ||
      guest.revoked ||
      guest.expires_at <= now ||
      guest.document_version !== documentVersion ||
      acquisition?.source_token_hash !== row.token_hash ||
      acquisition.consent_revision !== revision ||
      acquisition.source_consent_at?.getTime() !== guest.granted_at.getTime() ||
      guest.expires_at <= consentStart ||
      guest.granted_at > row.captured_at
    )
      return null;
    consentStart = guest.granted_at;
  }
  if (
    !row ||
    row.user_id !== userId ||
    row.consent_revision !== revision ||
    !eligible(consent, revision, documentVersion, now) ||
    row.expires_at <= now ||
    !browserIdWithinConsent(
      row.fbp,
      consentStart!.getTime(),
      row.captured_at.getTime(),
      now.getTime(),
    )
  )
    return null;
  return row;
}

export function createBrowserEvidence(host: string, grantedAt: Date, expiresAt: Date) {
  if (!/^(127\.0\.0\.1|localhost|[a-z0-9]+(?:[.-][a-z0-9]+)+)$/.test(host))
    throw new Error("Invalid reviewed browser identifier host");
  const builder = new ParamBuilder([host]);
  builder.processRequest(host, {}, {}, null, null, null);
  const fbp = builder.getFbp();
  const capturedAt = new Date();
  if (
    !fbp ||
    !isMetaBrowserId(fbp) ||
    builder.getFbc() ||
    builder.getClientIpAddress() ||
    builder.getEventSourceUrl() ||
    builder.getReferrerUrl() ||
    !browserIdWithinConsent(fbp, grantedAt.getTime(), capturedAt.getTime(), capturedAt.getTime()) ||
    capturedAt >= expiresAt
  )
    return null;
  return { fbp, capturedAt };
}

function eligible(
  consent: {
    revision: number;
    document_version: string | null;
    granted_at: Date | null;
    expires_at: Date | null;
    revoked_at: Date | null;
    user: { role: string; active: boolean; deleted: boolean };
  } | null,
  revision: number,
  documentVersion: string,
  now: Date,
) {
  return Boolean(
    consent &&
      consent.revision === revision &&
      consent.document_version === documentVersion &&
      consent.user.role === "psicologo" &&
      consent.user.active &&
      !consent.user.deleted &&
      consent.granted_at &&
      consent.expires_at &&
      hasAdvertisingConsent(
        {
          purpose: "meta_ads_measurement",
          documentVersion,
          grantedAt: consent.granted_at.getTime(),
          expiresAt: consent.expires_at.getTime(),
          revokedAt: consent.revoked_at?.getTime() ?? null,
        },
        now.getTime(),
      ),
  );
}

export async function captureBrowserIdentifier(
  userId: string,
  revision: number,
  documentVersion: string,
  cookie: unknown,
  now = new Date(),
  policy = BROWSER_IDENTIFIER_POLICY,
) {
  // No body/cookie parsing, identifier generation or database work while disabled.
  if (!policy.enabled || !policy.host) return { enabled: false as const };
  const host = policy.host;
  if (!/^(127\.0\.0\.1|localhost|[a-z0-9]+(?:[.-][a-z0-9]+)+)$/.test(host))
    throw new Error("Invalid reviewed browser identifier host");
  return withSerializableTransaction(async (tx) => {
    const consent = await tx.marketing_consent.findUnique({
      where: { user_id: userId },
      include: { user: { select: { role: true, active: true, deleted: true } } },
    });
    if (!eligible(consent, revision, documentVersion, now))
      return { enabled: true as const, clear: true as const };
    if (validToken(cookie)) {
      const row = await readBrowserIdentifier(tx, userId, cookie, revision, documentVersion, now);
      // Never resurrect expired or revoked evidence using a new identifier.
      if (!row) return { enabled: true as const, clear: true as const };
      return { enabled: true as const, token: cookie, expiresAt: row.expires_at };
    }
    if (cookie !== undefined) return { enabled: true as const, clear: true as const };
    const evidence = createBrowserEvidence(host, consent!.granted_at!, consent!.expires_at!);
    if (!evidence) return { enabled: true as const, clear: true as const };
    const { fbp, capturedAt } = evidence;
    const expiresAt = new Date(
      Math.min(consent!.expires_at!.getTime(), Number(fbp.split(".")[2]) + 30 * 86400000),
    );
    const token = randomBytes(32).toString("hex");
    await tx.marketing_browser_identifier.create({
      data: {
        token_hash: hash(token),
        user_id: userId,
        consent_revision: revision,
        fbp,
        captured_at: capturedAt,
        expires_at: expiresAt,
      },
    });
    return { enabled: true as const, token, expiresAt };
  });
}

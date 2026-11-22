import { z } from "zod";
import type { Prisma } from "@/external/generated/prisma/client";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { readBrowserIdentifier } from "./browser-identifier-repository";
import { readMetaConfig } from "./meta-config";
import { metaTransmissionDecision } from "./meta-policy";
import { persistProfessionalEvent } from "./professional-events";

export type CheckoutContextPolicy = {
  enabled: boolean;
  sandboxAccountId: string | null;
  sourceUrl: string | null;
  liveReview?: {
    accountId: string;
    documentVersion: string;
  };
};
export const CHECKOUT_CONTEXT_POLICY: CheckoutContextPolicy = {
  enabled: false,
  sandboxAccountId: null,
  sourceUrl: null,
};
const inputSchema = z
  .object({
    operationId: z.string().min(1).max(128),
    revision: z.number().int().positive(),
    documentVersion: z.string().min(1).max(128),
  })
  .strict();
const agentSchema = z
  .string()
  .min(1)
  .max(1024)
  .regex(/^[\x20-\x7E]+$/)
  .refine((value) => value.trim().length > 0);

// Live capture requires a separate explicit review; default policy remains disabled.
// The caller obtains identity/cookie/UA from the authenticated request,
// while URL and account are reviewed server configuration, never client fields.
export async function captureCheckoutContext(
  userId: string,
  cookie: unknown,
  userAgent: unknown,
  input: unknown,
  policy = CHECKOUT_CONTEXT_POLICY,
  now = new Date(),
) {
  const mode = policy.liveReview ? "live" : "test";
  const accountId = policy.liveReview?.accountId ?? policy.sandboxAccountId;
  if (!policy.enabled || !accountId || !policy.sourceUrl) return false;
  const parsed = inputSchema.safeParse(input);
  const agent = agentSchema.safeParse(userAgent);
  if (!parsed.success || !agent.success || typeof cookie !== "string") return false;
  const source = z.string().url().safeParse(policy.sourceUrl);
  if (!source.success) return false;
  const url = new URL(source.data);
  if (
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    !["https:", "http:"].includes(url.protocol)
  )
    return false;
  const { operationId, revision, documentVersion } = parsed.data;
  if (
    policy.liveReview &&
    (policy.sandboxAccountId !== null ||
      !policy.liveReview.documentVersion ||
      documentVersion !== policy.liveReview.documentVersion ||
      url.protocol !== "https:")
  )
    return false;
  return withSerializableTransaction(async (tx) => {
    const browser = await readBrowserIdentifier(tx, userId, cookie, revision, documentVersion, now);
    if (!browser) return false;
    const operation = await tx.billing_operation.findFirst({
      where: {
        id: operationId,
        user_id: userId,
        gateway: "stripe",
        mode,
        account_id: accountId,
        kind: "checkout",
        intent: "subscription",
        state: "requires_confirmation",
      },
    });
    if (!operation || operation.created_at > now) return false;
    const existing = await tx.marketing_checkout_context.findUnique({
      where: { operation_id: operationId },
    });
    // A retry cannot replace evidence, change browser or extend retention.
    if (existing) {
      const valid =
        existing.token_hash === browser.token_hash &&
        existing.document_version === documentVersion &&
        existing.source_url === policy.sourceUrl &&
        existing.expires_at > now;
      if (valid) await enqueueCapturedCheckout(tx, operationId, mode, now);
      return valid;
    }
    const consent = await tx.marketing_consent.findUniqueOrThrow({ where: { user_id: userId } });
    const expiresAt = new Date(
      Math.min(
        browser.expires_at.getTime(),
        consent.expires_at!.getTime(),
        now.getTime() + 86400000,
      ),
    );
    await tx.marketing_checkout_context.create({
      data: {
        operation_id: operationId,
        token_hash: browser.token_hash,
        document_version: documentVersion,
        source_url: policy.sourceUrl!,
        client_user_agent: agent.data,
        captured_at: now,
        expires_at: expiresAt,
      },
    });
    await enqueueCapturedCheckout(tx, operationId, mode, now);
    return true;
  });
}

export async function readCheckoutContext(
  tx: Prisma.TransactionClient,
  operationId: string,
  userId: string,
  cookie: string,
  revision: number,
  documentVersion: string,
  now: Date,
) {
  const browser = await readBrowserIdentifier(tx, userId, cookie, revision, documentVersion, now);
  if (!browser) return null;
  const context = await tx.marketing_checkout_context.findUnique({
    where: { operation_id: operationId },
  });
  if (
    !context ||
    context.token_hash !== browser.token_hash ||
    context.document_version !== documentVersion ||
    context.expires_at <= now ||
    context.captured_at > now
  )
    return null;
  return {
    userId,
    consentRevision: revision,
    documentVersion,
    capturedAtMs: context.captured_at.getTime(),
    sourceUrl: context.source_url,
    clientUserAgent: context.client_user_agent,
  };
}

async function enqueueCapturedCheckout(
  tx: Prisma.TransactionClient,
  operationId: string,
  mode: string,
  now: Date,
) {
  if (mode !== "live" || !metaTransmissionDecision("professional_checkout").allowed) return;
  const config = readMetaConfig();
  if (!config.enabled || !config.datasetId || !config.apiVersion || !config.token) return;
  await persistProfessionalEvent(tx, "professional_checkout", operationId, now);
}

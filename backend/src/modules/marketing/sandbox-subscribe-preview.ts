import { z } from "zod";
import type { Prisma } from "@/external/generated/prisma/client";
import { readBrowserIdentifier } from "./browser-identifier-repository";
import { readCheckoutContext } from "./checkout-context";
import { browserIdWithinConsent, metaBrowserIdSchema } from "./meta-browser-id";
import { prepareMetaTestPreview } from "./meta-test-preview";
import { resolveSandboxSubscribeSource } from "./sandbox-subscribe-source";

const browserSchema = z
  .object({
    userId: z.string().min(1),
    consentRevision: z.number().int().positive(),
    documentVersion: z.string().min(1),
    capturedAtMs: z.number().int().positive(),
    sourceUrl: z.string().url(),
    fbp: metaBrowserIdSchema,
    clientUserAgent: z
      .string()
      .min(1)
      .max(1024)
      .regex(/^[\x20-\x7E]+$/)
      .refine((value) => value.trim().length > 0),
  })
  .strict();

// Isolated caller supplies authenticated, consented browser capture; never an
// arbitrary request payload. This composition has no collection or sending path.
export async function prepareVerifiedSandboxPreview(
  tx: Prisma.TransactionClient,
  request: Parameters<typeof resolveSandboxSubscribeSource>[1],
  browserEvidence: unknown,
  reviewedSourceUrls: readonly string[],
  testCode: string,
  now: Date,
) {
  const parsed = browserSchema.safeParse(browserEvidence);
  if (!parsed.success) return null;
  const browser = parsed.data;
  if (
    browser.userId !== request.userId ||
    browser.consentRevision !== request.consentRevision ||
    browser.documentVersion !== request.documentVersion
  )
    return null;
  const source = await resolveSandboxSubscribeSource(tx, request, now);
  if (
    !source ||
    browser.capturedAtMs < source.consent.grantedAt ||
    browser.capturedAtMs > source.occurredAtMs ||
    now.getTime() - browser.capturedAtMs > 24 * 60 * 60 * 1000
  )
    return null;
  if (
    !browserIdWithinConsent(
      browser.fbp,
      source.consent.grantedAt,
      browser.capturedAtMs,
      now.getTime(),
    )
  )
    return null;
  return composePreview(source, browser, reviewedSourceUrls, testCode, now);
}

// Only an isolated authenticated caller may supply the current checkout context.
// Identifier value and pre-signup consent provenance are resolved from storage,
// never accepted from a client field. This function has no write or transport path.
export async function prepareStoredSandboxPreview(
  tx: Prisma.TransactionClient,
  request: Parameters<typeof resolveSandboxSubscribeSource>[1],
  browserToken: string,
  checkoutContext: unknown,
  reviewedSourceUrls: readonly string[],
  testCode: string,
  now: Date,
) {
  const parsed = browserSchema.omit({ fbp: true }).safeParse(checkoutContext);
  if (!parsed.success) return null;
  const context = parsed.data;
  if (
    context.userId !== request.userId ||
    context.consentRevision !== request.consentRevision ||
    context.documentVersion !== request.documentVersion
  )
    return null;
  const identifier = await readBrowserIdentifier(
    tx,
    request.userId,
    browserToken,
    request.consentRevision,
    request.documentVersion,
    now,
  );
  if (!identifier) return null;
  const source = await resolveSandboxSubscribeSource(tx, request, now);
  if (
    !source ||
    context.capturedAtMs < source.consent.grantedAt ||
    context.capturedAtMs < identifier.captured_at.getTime() ||
    context.capturedAtMs > source.occurredAtMs ||
    now.getTime() - context.capturedAtMs > 24 * 60 * 60 * 1000
  )
    return null;
  return composePreview(
    source,
    { ...context, fbp: identifier.fbp },
    reviewedSourceUrls,
    testCode,
    now,
  );
}

// No caller-provided checkout fields: resolve the operation from the canonical
// receipt, then load evidence captured before payment for exactly that operation.
export async function preparePersistedSandboxPreview(
  tx: Prisma.TransactionClient,
  request: Parameters<typeof resolveSandboxSubscribeSource>[1],
  browserToken: string,
  reviewedSourceUrls: readonly string[],
  testCode: string,
  now: Date,
) {
  const source = await resolveSandboxSubscribeSource(tx, request, now);
  if (!source) return null;
  const context = await readCheckoutContext(
    tx,
    source.operationId,
    request.userId,
    browserToken,
    request.consentRevision,
    request.documentVersion,
    now,
  );
  if (!context) return null;
  return prepareStoredSandboxPreview(
    tx,
    request,
    browserToken,
    context,
    reviewedSourceUrls,
    testCode,
    now,
  );
}

function composePreview(
  source: NonNullable<Awaited<ReturnType<typeof resolveSandboxSubscribeSource>>>,
  browser: z.infer<typeof browserSchema>,
  reviewedSourceUrls: readonly string[],
  testCode: string,
  now: Date,
) {
  return prepareMetaTestPreview(
    testCode,
    {
      consent: source.consent,
      occurredAtMs: source.occurredAtMs,
      candidate: {
        conversion: "professional_subscription",
        eventId: source.eventId,
        occurredAt: Math.floor(source.occurredAtMs / 1000),
        amountCents: source.amountCents,
        sourceUrl: browser.sourceUrl,
        fbp: browser.fbp,
      },
    },
    reviewedSourceUrls,
    browser.documentVersion,
    now.getTime(),
    {
      environment: "local",
      stripeMode: "test",
      participant: "owner_test_account",
      clientUserAgent: browser.clientUserAgent,
    },
  );
}

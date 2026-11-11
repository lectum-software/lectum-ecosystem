import { getPaymentGateway } from "../payment-gateway";
import type { GatewayInvoicePayment } from "../payment-gateway/PaymentGateway";
import { requireInvoiceBillingAddress, toSendNfAddress } from "./billing-address";
import {
  canIssuePayment,
  getInvoiceConfig,
  type InvoiceConfig,
  InvoiceError,
  retryDate,
} from "./config";
import {
  assertDocumentMatches,
  invoiceReference,
  invoiceRequestSchema,
  parseProvider,
  storedInvoiceSchema,
} from "./contracts";
import {
  invoiceFailure,
  invoiceJobFailure,
  invoiceVerificationFailuresAfterPayment,
  logInvoiceOutcome,
  safeInvoiceDiagnostic,
} from "./diagnostics";
import { invoiceDocumentNextAttempt, invoiceDocumentStatus } from "./document-authorization";
import { getFiscalIdentity } from "./fiscal-identity";
import { invoiceGatewayScopes, invoiceScopeMatches } from "./gateway-scope";
import { InvoiceRepository } from "./repository";
import { SendNfAdapter } from "./SendNfAdapter";

export function assertEligiblePayment(
  payment: GatewayInvoicePayment,
  config: Pick<InvoiceConfig, "paymentsFrom" | "mode">,
) {
  const now = Date.now();
  if (payment.liveMode !== (config.mode === "live") || payment.currency !== "BRL")
    throw new InvoiceError("payment_environment_mismatch");
  if (payment.status !== "approved" || payment.refundedCents > 0)
    throw new InvoiceError("payment_not_eligible");
  if (
    !(payment.paidAt instanceof Date) ||
    !Number.isFinite(payment.paidAt.getTime()) ||
    payment.paidAt < config.paymentsFrom ||
    payment.paidAt.getTime() > now ||
    (payment.invoicePaidAt !== undefined &&
      (!(payment.invoicePaidAt instanceof Date) ||
        !Number.isFinite(payment.invoicePaidAt.getTime()) ||
        payment.invoicePaidAt.getTime() > now)) ||
    payment.amountCents <= 0
  ) {
    throw new InvoiceError("payment_outside_scope");
  }
}

const scopedGateway = (
  record: { gateway: string; account_id: string | null; mode: string | null },
  config: InvoiceConfig,
  legacyJob = false,
) => {
  const scopes = invoiceGatewayScopes(config.mode);
  if (!invoiceScopeMatches(scopes, record, legacyJob))
    throw new InvoiceError("payment_environment_mismatch");
  const scope = scopes.find(
    (item) => item.gateway === record.gateway && item.accountId === record.account_id,
  )!;
  return { gateway: getPaymentGateway(scope.gateway), scope };
};

/** Pause only new issuance; existing documents remain available for reconciliation and PDF reads. */
export async function deferInvoiceIssuance(
  config: InvoiceConfig,
  repository: Pick<InvoiceRepository, "finishInvoice">,
  invoice: {
    id: string;
    gateway: string;
    payment_id: string;
    document_id: string | null;
    lease_token: string;
  },
) {
  if (invoice.document_id || canIssuePayment(config, invoice.payment_id, invoice.gateway))
    return false;
  await repository.finishInvoice(invoice.id, invoice.lease_token, {
    status: "awaiting_activation",
    next_attempt_at: retryDate(6),
  });
  return true;
}

async function processJob(config: InvoiceConfig, repository: InvoiceRepository, ids?: string[]) {
  const job = await repository.claimJob(invoiceGatewayScopes(config.mode), new Date(), ids);
  if (!job) return false;
  let paymentVerified = false;
  let verificationFailures = job.verification_failures;
  try {
    const { gateway, scope } = scopedGateway(job, config, true);
    const resourceType = scope.gateway === "stripe" ? "invoice" : job.resource_type;
    if (
      scope.gateway === "stripe"
        ? job.resource_type !== "invoice" || !job.provider_resource_id
        : job.resource_type !== "payment" && job.resource_type !== "subscription_authorized_payment"
    )
      throw new InvoiceError("resource_invalid");
    const payment = await gateway.getInvoicePayment(
      resourceType as "invoice" | "payment" | "subscription_authorized_payment",
      job.provider_resource_id ?? job.resource_id,
    );
    assertEligiblePayment(payment, config);
    verificationFailures = invoiceVerificationFailuresAfterPayment(
      verificationFailures,
      job.last_error_code,
    );
    const subscription = await repository.subscription(payment.subscriptionId, scope);
    const remote = await gateway.getSubscription(payment.subscriptionId);
    if (
      remote.external_reference !== subscription.id ||
      (payment.externalReference && payment.externalReference !== subscription.id)
    )
      throw new InvoiceError("subscription_reference_mismatch");
    paymentVerified = true;
    const user = subscription.psychologist.user;
    const billingAddress = requireInvoiceBillingAddress(await repository.billingAddress(user.id));
    const fiscalIdentity = await getFiscalIdentity(subscription.psychologist);
    const reference = invoiceReference(
      config.companyId,
      payment.paymentId,
      config.mode,
      scope.accountId ?? undefined,
    );
    const snapshot = invoiceRequestSchema.safeParse({
      company_id: config.companyId,
      reference,
      ...(config.mode === "live" ? { iss_rate: config.issRate } : { simulation: "never" }),
      taker: {
        address: toSendNfAddress(billingAddress),
        name: fiscalIdentity?.full_name,
        document: subscription.psychologist.cpf,
        email: user.email,
      },
      items: [{ description: config.description, unit_amount: payment.amountCents }],
    });
    if (!snapshot.success) throw new InvoiceError("recipient_incomplete", true);
    await repository.record({
      gateway: scope.gateway,
      account_id: scope.accountId,
      payment_id: payment.paymentId,
      mode: config.mode,
      user_id: user.id,
      subscription_id: subscription.id,
      company_id: config.companyId,
      amount_cents: payment.amountCents,
      currency: payment.currency,
      paid_at: payment.paidAt!,
      reference,
      request_snapshot: {
        ...snapshot.data,
        billing_address: billingAddress,
        ...(config.mode === "live" ? { fiscal_service_code: config.serviceCode } : {}),
      },
    });
    await repository.finishJob(
      job.id,
      job.lease_token,
      {
        completed_at: new Date(),
        last_error_code: null,
        verification_failures: 0,
      },
      job.event_id,
    );
    logInvoiceOutcome({
      id: job.id,
      stage: "payment_verification",
      outcome: "snapshot_ready",
      attempts: job.attempts,
    });
  } catch (error) {
    // Missing recipient data can keep a paid job pending for days. Only consecutive
    // failed verifications consume the read-recovery budget, never those waits.
    const failure = invoiceJobFailure(error, job.gateway, verificationFailures, paymentVerified);
    await repository.finishJob(
      job.id,
      job.lease_token,
      {
        ...(failure.terminal
          ? { completed_at: new Date() }
          : { next_attempt_at: retryDate(job.attempts) }),
        last_error_code: failure.code,
        verification_failures: failure.verificationFailures,
      },
      job.event_id,
    );
    logInvoiceOutcome({
      id: job.id,
      stage: "payment_verification",
      outcome: failure.terminal
        ? ["zero_invoice", "void_invoice", "uncollectible_invoice"].includes(failure.code)
          ? "excluded"
          : "review_required"
        : "retry",
      code: failure.code,
      attempts: job.attempts,
    });
  }
  return true;
}

async function processInvoice(
  config: InvoiceConfig,
  repository: InvoiceRepository,
  provider: SendNfAdapter,
  ids?: string[],
) {
  const invoice = await repository.claimInvoice(
    config.companyId,
    invoiceGatewayScopes(config.mode),
    new Date(),
    config.mode,
    ids,
  );
  if (!invoice) return false;
  try {
    const request = parseProvider(invoiceRequestSchema, invoice.request_snapshot);
    const stored = parseProvider(storedInvoiceSchema, invoice.request_snapshot);
    if (
      request.company_id !== config.companyId ||
      request.reference !== invoice.reference ||
      request.items[0].unit_amount !== invoice.amount_cents ||
      invoice.mode !== config.mode ||
      (config.mode === "live" && (!stored.fiscal_service_code || request.iss_rate === undefined))
    ) {
      throw new InvoiceError("snapshot_invalid");
    }
    // Recheck the payment before sending; refunds never trigger a fiscal cancellation automatically.
    const { gateway, scope } = scopedGateway(invoice, config);
    const payment = await gateway.getInvoicePayment(
      scope.gateway === "stripe" ? "invoice" : "payment",
      invoice.payment_id,
    );
    assertEligiblePayment(payment, config);
    const subscription = await repository.subscription(payment.subscriptionId, scope);
    if (
      subscription.id !== invoice.subscription_id ||
      subscription.psychologist.user_id !== invoice.user_id ||
      payment.amountCents !== invoice.amount_cents
    ) {
      throw new InvoiceError("payment_snapshot_mismatch");
    }
    if (!invoice.document_id) {
      // Do not silently issue legacy snapshots without billing evidence.
      if (!stored.billing_address || !request.taker.address)
        throw new InvoiceError("billing_address_snapshot_missing");
      if (await deferInvoiceIssuance(config, repository, invoice)) {
        logInvoiceOutcome({
          id: invoice.id,
          stage: "document",
          outcome: "deferred",
          attempts: invoice.attempts,
        });
        return true;
      }
      const readiness = await provider.readiness();
      if (!readiness.ready) {
        await repository.finishInvoice(invoice.id, invoice.lease_token, {
          status: "awaiting_configuration",
          last_error_code: "company_not_ready",
          next_attempt_at: retryDate(6),
        });
        logInvoiceOutcome({
          id: invoice.id,
          stage: "document",
          outcome: "deferred",
          code: "company_not_ready",
          attempts: invoice.attempts,
        });
        return true;
      }
    }
    const document = invoice.document_id
      ? await provider.getDocument(invoice.document_id)
      : await provider.create(request, stored.fiscal_service_code);
    assertDocumentMatches(document, request, config.mode);
    const status = invoiceDocumentStatus(document);
    await repository.finishInvoice(invoice.id, invoice.lease_token, {
      document_id: document.id,
      status,
      number: document.nfse_number,
      last_error_code: document.failure_code ? safeInvoiceDiagnostic(document.failure_code) : null,
      next_attempt_at: invoiceDocumentNextAttempt(status),
    });
    logInvoiceOutcome({
      id: invoice.id,
      stage: "document",
      outcome: "observed",
      documentStatus: status,
      code: document.failure_code,
      attempts: invoice.attempts,
    });
  } catch (error) {
    // Document attempts also count successful polls and deferred activation, not consecutive failures.
    const failure = invoiceFailure(error, invoice.gateway, invoice.attempts, false);
    await repository.finishInvoice(invoice.id, invoice.lease_token, {
      ...(failure.terminal ? { status: "manual_review" } : {}),
      last_error_code: failure.code,
      next_attempt_at: retryDate(invoice.attempts),
    });
    logInvoiceOutcome({
      id: invoice.id,
      stage: "document",
      outcome: failure.terminal ? "review_required" : "retry",
      code: failure.code,
      attempts: invoice.attempts,
    });
  }
  return true;
}

export type InvoiceQueueSelection = { jobIds?: string[]; invoiceIds?: string[] };
export const invoiceQueueSelection = (selection?: InvoiceQueueSelection) => {
  if (selection === undefined) return { jobIds: undefined, invoiceIds: undefined };
  const ids = (values: string[] | undefined) => {
    if (values === undefined) return [];
    if (
      !Array.isArray(values) ||
      values.length > 5 ||
      values.some((id) => typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) ||
      new Set(values).size !== values.length
    )
      throw new InvoiceError("resource_invalid");
    return values;
  };
  // A selected run never falls back to all rows when one side is omitted.
  return { jobIds: ids(selection.jobIds), invoiceIds: ids(selection.invoiceIds) };
};

export async function processInvoiceQueue(selection?: InvoiceQueueSelection) {
  const selected = invoiceQueueSelection(selection);
  const config = getInvoiceConfig();
  if (!config) return;
  const repository = new InvoiceRepository();
  const provider = new SendNfAdapter(config.apiKey, config.companyId, config.mode);
  await provider.verifyIdentity();
  // Bounded batches keep fiscal work independent from the payment callback and entitlement.
  for (let i = 0; i < 5; i++) if (!(await processJob(config, repository, selected.jobIds))) break;
  for (let i = 0; i < 5; i++)
    if (!(await processInvoice(config, repository, provider, selected.invoiceIds))) break;
}

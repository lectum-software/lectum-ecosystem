import { getPaymentGateway } from "../payment-gateway";
import type { GatewayInvoicePayment } from "../payment-gateway/PaymentGateway";
import { requireInvoiceBillingAddress, toSendNfAddress } from "./billing-address";
import {
  canIssuePayment,
  getInvoiceConfig,
  type InvoiceConfig,
  InvoiceError,
  invoiceErrorCode,
  retryDate,
} from "./config";
import {
  assertDocumentMatches,
  invoiceReference,
  invoiceRequestSchema,
  parseProvider,
  storedInvoiceSchema,
} from "./contracts";
import { getFiscalIdentity } from "./fiscal-identity";
import { InvoiceRepository } from "./repository";
import { SendNfAdapter } from "./SendNfAdapter";

export function assertEligiblePayment(
  payment: GatewayInvoicePayment,
  config: Pick<InvoiceConfig, "paymentsFrom" | "mode">,
) {
  if (payment.liveMode !== (config.mode === "live") || payment.currency !== "BRL")
    throw new InvoiceError("payment_environment_mismatch");
  if (payment.status !== "approved" || payment.refundedCents > 0)
    throw new InvoiceError("payment_not_eligible");
  if (
    !payment.paidAt ||
    payment.paidAt < config.paymentsFrom ||
    payment.paidAt.getTime() > Date.now() ||
    payment.amountCents <= 0
  ) {
    throw new InvoiceError("payment_outside_scope");
  }
}

async function processJob(config: InvoiceConfig, repository: InvoiceRepository) {
  const job = await repository.claimJob();
  if (!job) return false;
  try {
    if (job.resource_type !== "payment" && job.resource_type !== "subscription_authorized_payment")
      throw new InvoiceError("resource_invalid");
    const gateway = getPaymentGateway();
    const payment = await gateway.getInvoicePayment(job.resource_type, job.resource_id);
    assertEligiblePayment(payment, config);
    const subscription = await repository.subscription(payment.subscriptionId);
    const remote = await gateway.getSubscription(payment.subscriptionId);
    if (
      remote.external_reference !== subscription.id ||
      (payment.externalReference && payment.externalReference !== subscription.id)
    )
      throw new InvoiceError("subscription_reference_mismatch");
    const user = subscription.psychologist.user;
    const billingAddress = requireInvoiceBillingAddress(await repository.billingAddress(user.id));
    const fiscalIdentity = await getFiscalIdentity(subscription.psychologist);
    const reference = invoiceReference(config.companyId, payment.paymentId, config.mode);
    const snapshot = invoiceRequestSchema.safeParse({
      company_id: config.companyId,
      reference,
      ...(config.mode === "live" ? { iss_rate: config.issRate } : {}),
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
      },
      job.event_id,
    );
  } catch (error) {
    const terminal = error instanceof InvoiceError && !error.retryable;
    await repository.finishJob(
      job.id,
      job.lease_token,
      {
        ...(terminal ? { completed_at: new Date() } : { next_attempt_at: retryDate(job.attempts) }),
        last_error_code: invoiceErrorCode(error),
      },
      job.event_id,
    );
  }
  return true;
}

async function processInvoice(
  config: InvoiceConfig,
  repository: InvoiceRepository,
  provider: SendNfAdapter,
) {
  const invoice = await repository.claimInvoice(config.companyId, new Date(), config.mode);
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
    const payment = await getPaymentGateway().getInvoicePayment("payment", invoice.payment_id);
    assertEligiblePayment(payment, config);
    const subscription = await repository.subscription(payment.subscriptionId);
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
      if (!canIssuePayment(config, invoice.payment_id)) {
        await repository.finishInvoice(invoice.id, invoice.lease_token, {
          status: "awaiting_activation",
          next_attempt_at: retryDate(6),
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
        return true;
      }
    }
    const document = invoice.document_id
      ? await provider.getDocument(invoice.document_id)
      : await provider.create(request, stored.fiscal_service_code);
    assertDocumentMatches(document, request, config.mode);
    await repository.finishInvoice(invoice.id, invoice.lease_token, {
      document_id: document.id,
      status: document.status,
      number: document.nfse_number,
      last_error_code: null,
      next_attempt_at: new Date(
        Date.now() + (document.status === "authorized" ? 24 * 60 : 5) * 60_000,
      ),
    });
  } catch (error) {
    const terminal = error instanceof InvoiceError && !error.retryable;
    await repository.finishInvoice(invoice.id, invoice.lease_token, {
      ...(terminal ? { status: "manual_review" } : {}),
      last_error_code: invoiceErrorCode(error),
      next_attempt_at: retryDate(invoice.attempts),
    });
  }
  return true;
}

export async function processInvoiceQueue() {
  const config = getInvoiceConfig();
  if (!config) return;
  const repository = new InvoiceRepository();
  const provider = new SendNfAdapter(config.apiKey, config.companyId, config.mode);
  await provider.verifyIdentity();
  // Bounded batches keep fiscal work independent from the payment callback and entitlement.
  for (let i = 0; i < 5; i++) if (!(await processJob(config, repository))) break;
  for (let i = 0; i < 5; i++) if (!(await processInvoice(config, repository, provider))) break;
}

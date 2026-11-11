import { createHash } from "node:crypto";
import prisma from "@/infra/database/prisma";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { getStripeGateway } from "../payment-gateway";
import { getInvoiceConfig } from "./config";
import { invoiceOperationReference } from "./diagnostics";
import { invoiceGatewayScopes } from "./gateway-scope";
import {
  type FiscalRecoveryArguments,
  FiscalRecoveryError,
  validateFiscalRecoveryArguments,
} from "./recovery-policy";
import { InvoiceRepository } from "./repository";
import { assertEligiblePayment } from "./worker";

const eligibleAdmin = (id: string) => ({
  id,
  active: true,
  confirmed: true,
  deleted: false,
  need_reset: false,
});

/** Provider GET proof only; application is local and audited, never executes either worker. */
export const recoverStripeInvoice = async (args: FiscalRecoveryArguments) => {
  validateFiscalRecoveryArguments(args);
  if (!(await prisma.admin.count({ where: eligibleAdmin(args.actorAdminId) })))
    throw new FiscalRecoveryError();
  const config = getInvoiceConfig();
  const gateway = getStripeGateway();
  const identity = gateway.identity;
  const scope =
    config &&
    invoiceGatewayScopes(config.mode).find(
      (item) =>
        item.gateway === "stripe" && item.accountId === args.accountId && item.mode === args.mode,
    );
  if (!config || !scope || identity.mode !== args.mode || identity.accountId !== args.accountId)
    throw new FiscalRecoveryError();
  const payment = await gateway.getInvoicePayment("invoice", args.invoiceId);
  assertEligiblePayment(payment, config);
  const subscription = await new InvoiceRepository().subscription(payment.subscriptionId, scope);
  const remote = await gateway.getSubscription(payment.subscriptionId);
  if (
    payment.paymentId !== args.invoiceId ||
    remote.external_reference !== subscription.id ||
    (payment.externalReference && payment.externalReference !== subscription.id) ||
    payment.amountCents !== subscription.contracted_amount_cents ||
    subscription.contracted_currency !== "BRL"
  )
    throw new FiscalRecoveryError();
  return applyVerifiedFiscalRecovery(args, {
    subscriptionId: subscription.id,
    subscriptionUpdatedAt: subscription.updatedAt,
    userId: subscription.psychologist.user_id,
    companyId: config.companyId,
    amountCents: payment.amountCents,
  });
};

/** Internal persistence boundary; callers must first obtain canonical paid evidence. */
export const applyVerifiedFiscalRecovery = async (
  args: FiscalRecoveryArguments,
  proof: {
    subscriptionId: string;
    subscriptionUpdatedAt: Date;
    userId: string;
    companyId: string;
    amountCents: number;
  },
) => {
  validateFiscalRecoveryArguments(args);
  const resourceId = createHash("sha256")
    .update(`stripe:${args.mode}:${args.accountId}:${args.invoiceId}`)
    .digest("hex");
  return withSerializableTransaction(async (tx) => {
    const admin = await tx.admin.findFirst({
      where: eligibleAdmin(args.actorAdminId),
      select: { id: true },
    });
    const subscription = await tx.professional_subscription.findFirst({
      where: {
        id: proof.subscriptionId,
        updatedAt: proof.subscriptionUpdatedAt,
        gateway: "stripe",
        gateway_mode: args.mode,
        gateway_account_id: args.accountId,
        deleted: false,
        contracted_amount_cents: proof.amountCents,
        contracted_currency: "BRL",
        psychologist: { user_id: proof.userId, deleted: false, user: { deleted: false } },
      },
      select: { id: true },
    });
    if (!admin || !subscription) throw new FiscalRecoveryError();
    const job = await tx.billing_invoice_job.findUnique({
      where: {
        resource_type_resource_id: { resource_type: "invoice", resource_id: resourceId },
      },
    });
    const invoice = await tx.billing_invoice.findUnique({
      where: {
        gateway_payment_id_mode: { gateway: "stripe", payment_id: args.invoiceId, mode: args.mode },
      },
    });
    if (
      (job?.attempts ?? null) !== args.expectedJobAttempts ||
      (invoice?.attempts ?? null) !== args.expectedInvoiceAttempts ||
      (job &&
        (job.gateway !== "stripe" ||
          job.account_id !== args.accountId ||
          job.mode !== args.mode ||
          job.provider_resource_id !== args.invoiceId ||
          !job.completed_at ||
          job.lease_token ||
          job.lease_until)) ||
      (invoice &&
        (invoice.account_id !== args.accountId ||
          invoice.company_id !== proof.companyId ||
          invoice.user_id !== proof.userId ||
          invoice.subscription_id !== proof.subscriptionId ||
          invoice.amount_cents !== proof.amountCents ||
          invoice.currency !== "BRL" ||
          invoice.lease_token ||
          invoice.lease_until ||
          ![
            "manual_review",
            "rejected",
            "failed",
            "authorization_unverified",
            "awaiting_configuration",
            "awaiting_activation",
          ].includes(invoice.status)))
    )
      throw new FiscalRecoveryError();
    const result = {
      invoice_ref: invoiceOperationReference(args.invoiceId),
      mode: args.mode,
      applied: false,
      paid_evidence_verified: true,
      document_preserved: Boolean(invoice?.document_id),
      snapshot_preserved: Boolean(invoice),
      provider_writes: 0,
      worker_executed: false,
    };
    if (!args.apply) return result;
    const now = new Date();
    const eventId = `operator:${invoiceOperationReference(args.invoiceId)}:${now.getTime()}`;
    let targetJobId = job?.id;
    if (job) {
      const changed = await tx.billing_invoice_job.updateMany({
        where: {
          id: job.id,
          updated_at: job.updated_at,
          completed_at: job.completed_at,
          attempts: job.attempts,
          lease_token: null,
          lease_until: null,
        },
        data: {
          completed_at: null,
          next_attempt_at: now,
          event_id: eventId,
          verification_failures: 0,
        },
      });
      if (changed.count !== 1) throw new FiscalRecoveryError();
    } else {
      const createdJob = await tx.billing_invoice_job.create({
        data: {
          gateway: "stripe",
          mode: args.mode,
          account_id: args.accountId,
          resource_type: "invoice",
          resource_id: resourceId,
          provider_resource_id: args.invoiceId,
          event_id: eventId,
        },
      });
      targetJobId = createdJob.id;
    }
    if (invoice) {
      const changed = await tx.billing_invoice.updateMany({
        where: {
          id: invoice.id,
          updated_at: invoice.updated_at,
          attempts: invoice.attempts,
          status: invoice.status,
          lease_token: null,
          lease_until: null,
        },
        // Never replace snapshot/reference/document, including a response-lost idempotent create.
        data: { status: invoice.document_id ? "processing" : "queued", next_attempt_at: now },
      });
      if (changed.count !== 1) throw new FiscalRecoveryError();
    }
    await tx.admin_activity_log.create({
      data: {
        admin_id: admin.id,
        target_type: "billing_invoice_job",
        target_id: targetJobId!,
        domain: "billing",
        action: "stripe_fiscal_recovery_queued",
        source: "operator_cli",
        reason: args.reason,
        changed_fields: [
          "completed_at",
          "next_attempt_at",
          "verification_failures",
          ...(invoice ? ["status"] : []),
        ],
        safe_before: {
          job_present: Boolean(job),
          invoice_present: Boolean(invoice),
          document_present: Boolean(invoice?.document_id),
          job_attempts: job?.attempts ?? null,
          job_verification_failures: job?.verification_failures ?? null,
          invoice_attempts: invoice?.attempts ?? null,
        },
        safe_after: {
          queued: true,
          verification_failures: 0,
          snapshot_preserved: Boolean(invoice),
          document_preserved: Boolean(invoice?.document_id),
        },
        metadata: {
          gateway: "stripe",
          mode: args.mode,
          provider_writes: 0,
          worker_executed: false,
        },
      },
    });
    return { ...result, applied: true };
  });
};

import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { GatewayWebhookEvent } from "../payment-gateway/PaymentGateway";
import { InvoiceError, type InvoiceMode } from "./config";
import { type InvoiceGatewayScope, invoiceGatewayScopes, invoiceScopeWhere } from "./gateway-scope";

const leaseAvailable = (now: Date) => ({
  OR: [{ lease_until: null }, { lease_until: { lt: now } }],
});
const leaseData = (now: Date) => ({
  lease_token: randomUUID(),
  lease_until: new Date(now.getTime() + 5 * 60_000),
});

export class InvoiceRepository {
  async enqueue(event: GatewayWebhookEvent) {
    if (
      !["payment", "subscription_authorized_payment"].includes(event.type) ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(event.resourceId)
    )
      return;
    await prisma.billing_invoice_job.upsert({
      where: {
        resource_type_resource_id: { resource_type: event.type, resource_id: event.resourceId },
      },
      create: {
        resource_type: event.type,
        resource_id: event.resourceId,
        event_id: event.externalId.slice(0, 200),
      },
      update: {
        completed_at: null,
        next_attempt_at: new Date(),
        event_id: event.externalId.slice(0, 200),
      },
    });
  }

  async enqueueStripe(input: {
    invoiceId: string;
    eventId: string;
    accountId: string;
    mode: InvoiceMode;
  }) {
    if (
      !/^in_[A-Za-z0-9]{1,100}$/.test(input.invoiceId) ||
      !/^evt_[A-Za-z0-9]{1,100}$/.test(input.eventId) ||
      !/^acct_[A-Za-z0-9]{1,100}$/.test(input.accountId)
    )
      throw new InvoiceError("resource_invalid");
    const resourceId = createHash("sha256")
      .update(`stripe:${input.mode}:${input.accountId}:${input.invoiceId}`)
      .digest("hex");
    const key = { resource_type: "invoice", resource_id: resourceId };
    const change = { completed_at: null, next_attempt_at: new Date(), event_id: input.eventId };
    try {
      await prisma.billing_invoice_job.upsert({
        where: { resource_type_resource_id: key },
        create: {
          ...key,
          ...change,
          gateway: "stripe",
          mode: input.mode,
          account_id: input.accountId,
          provider_resource_id: input.invoiceId,
        },
        update: change,
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002")
        throw error;
      await prisma.billing_invoice_job.update({
        where: { resource_type_resource_id: key },
        data: change,
      });
    }
  }

  async claimJob(scopes: InvoiceGatewayScope[], now = new Date(), ids?: string[]) {
    const where = {
      ...(ids === undefined ? {} : { id: { in: ids } }),
      completed_at: null,
      next_attempt_at: { lte: now },
      AND: [invoiceScopeWhere(scopes, true), leaseAvailable(now)],
    };
    const candidate = await prisma.billing_invoice_job.findFirst({
      where,
      orderBy: { next_attempt_at: "asc" },
    });
    if (!candidate) return null;
    const lease = leaseData(now);
    const result = await prisma.billing_invoice_job.updateMany({
      where: { id: candidate.id, ...where },
      data: { ...lease, attempts: { increment: 1 } },
    });
    return result.count ? { ...candidate, ...lease, attempts: candidate.attempts + 1 } : null;
  }

  async finishJob(
    id: string,
    token: string,
    data: { completed_at?: Date; next_attempt_at?: Date; last_error_code: string | null },
    eventId?: string,
  ) {
    await prisma.billing_invoice_job.updateMany({
      where: { id, lease_token: token, ...(eventId ? { event_id: eventId } : {}) },
      data: { ...data, lease_token: null, lease_until: null },
    });
  }

  async subscription(gatewayId: string, scope: InvoiceGatewayScope) {
    const rows = await prisma.professional_subscription.findMany({
      where: {
        gateway: scope.gateway,
        ...(scope.gateway === "stripe"
          ? { gateway_mode: scope.mode, gateway_account_id: scope.accountId }
          : {}),
        gateway_subscription_id: gatewayId,
        deleted: false,
        psychologist: { deleted: false, user: { deleted: false } },
      },
      include: {
        psychologist: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
      take: 2,
    });
    if (rows.length !== 1) throw new InvoiceError("subscription_mapping_unresolved", true);
    return rows[0];
  }

  billingAddress(userId: string) {
    return prisma.billing_address.findFirst({
      where: { user_id: userId, deleted: false },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  }

  async record(data: Prisma.billing_invoiceCreateInput) {
    const key = {
      gateway: data.gateway ?? "mercadopago",
      payment_id: data.payment_id,
      mode: data.mode ?? "test",
    };
    const invoice = await prisma.billing_invoice.upsert({
      where: { gateway_payment_id_mode: key },
      create: data,
      update: {},
    });
    if (
      invoice.account_id !== (data.account_id ?? null) ||
      invoice.currency !== data.currency ||
      invoice.reference !== data.reference ||
      invoice.user_id !== data.user_id ||
      invoice.company_id !== data.company_id ||
      invoice.amount_cents !== data.amount_cents ||
      invoice.subscription_id !== data.subscription_id
    ) {
      throw new InvoiceError("payment_snapshot_mismatch");
    }
    return invoice;
  }

  async claimInvoice(
    companyId: string,
    scopes: InvoiceGatewayScope[],
    now = new Date(),
    mode: InvoiceMode = "test",
    ids?: string[],
  ) {
    const where = {
      ...(ids === undefined ? {} : { id: { in: ids } }),
      company_id: companyId,
      mode,
      status: { notIn: ["manual_review", "cancelled", "rejected"] },
      next_attempt_at: { lte: now },
      AND: [
        {
          OR: scopes.map((scope) => ({
            gateway: scope.gateway,
            account_id: scope.accountId,
            mode: scope.mode,
          })),
        },
        leaseAvailable(now),
      ],
    };
    const candidate = await prisma.billing_invoice.findFirst({
      where,
      orderBy: { next_attempt_at: "asc" },
    });
    if (!candidate) return null;
    const lease = leaseData(now);
    const result = await prisma.billing_invoice.updateMany({
      where: { id: candidate.id, ...where },
      data: { ...lease, attempts: { increment: 1 } },
    });
    return result.count ? { ...candidate, ...lease, attempts: candidate.attempts + 1 } : null;
  }

  async finishInvoice(
    id: string,
    token: string,
    data: Prisma.billing_invoiceUpdateManyMutationInput,
  ) {
    await prisma.billing_invoice.updateMany({
      where: { id, lease_token: token },
      data: { ...data, lease_token: null, lease_until: null },
    });
  }

  listForUser(userId: string, companyId: string, mode: InvoiceMode = "test") {
    return prisma.billing_invoice.findMany({
      where: {
        user_id: userId,
        company_id: companyId,
        mode,
        OR: invoiceGatewayScopes(mode).map((scope) => ({
          gateway: scope.gateway,
          account_id: scope.accountId,
        })),
      },
      orderBy: { paid_at: "desc" },
      take: 100,
    });
  }

  findOwned(id: string, userId: string) {
    return prisma.billing_invoice.findFirst({ where: { id, user_id: userId } });
  }
}

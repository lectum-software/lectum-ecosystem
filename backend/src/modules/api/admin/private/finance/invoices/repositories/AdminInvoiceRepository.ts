import prisma from "@/infra/database/prisma";
import type {
  AdminInvoiceDownloadAudit,
  IAdminInvoiceRepository,
} from "./interfaces/IAdminInvoiceRepository";

export class AdminInvoiceRepository implements IAdminInvoiceRepository {
  async findForUser(id: string, userId: string) {
    const invoice = await prisma.billing_invoice.findFirst({ where: { id, user_id: userId } });
    if (!invoice) return null;
    const subscription = await prisma.professional_subscription.findFirst({
      where: {
        id: invoice.subscription_id,
        deleted: false,
        psychologist: { user_id: userId, deleted: false, user: { deleted: false } },
      },
      select: {
        id: true,
        updatedAt: true,
        gateway: true,
        source: true,
        gateway_mode: true,
        gateway_account_id: true,
        psychologist: { select: { id: true, user_id: true } },
      },
    });
    return subscription ? { invoice, subscription } : null;
  }

  /** Fail closed if actor or local document changed while remote GETs were in flight. */
  async recordPreparedDownload(input: AdminInvoiceDownloadAudit) {
    return prisma.$transaction(async (tx) => {
      const actor = await tx.admin.findFirst({
        where: { id: input.adminId, active: true, confirmed: true, deleted: false },
        select: { id: true },
      });
      const invoice = await tx.billing_invoice.findFirst({
        where: {
          id: input.invoiceId,
          user_id: input.userId,
          updated_at: input.updatedAt,
          status: "authorized",
          mode: input.mode,
        },
        select: { id: true, subscription_id: true },
      });
      if (!actor || !invoice) return false;
      const subscription = await tx.professional_subscription.findFirst({
        where: {
          id: invoice.subscription_id,
          updatedAt: input.subscriptionUpdatedAt,
          deleted: false,
          psychologist: {
            user_id: input.userId,
            deleted: false,
            user: { deleted: false },
          },
        },
        select: { id: true },
      });
      if (!subscription) return false;
      await tx.admin_activity_log.create({
        data: {
          admin_id: actor.id,
          target_type: "billing_invoice",
          target_id: invoice.id,
          domain: "billing_invoice",
          action: "billing_invoice_pdf_prepared",
          source: "admin_panel",
          area: "financeiro",
          metadata: { outcome: "prepared", mode: input.mode },
        },
      });
      return true;
    });
  }
}

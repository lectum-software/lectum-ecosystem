import type {
  billing_invoice,
  professional_subscription,
  psychologist_profile,
} from "@/external/generated/prisma/client";

export type AdminInvoiceRecord = {
  invoice: billing_invoice;
  subscription: Pick<
    professional_subscription,
    "id" | "updatedAt" | "gateway" | "source" | "gateway_mode" | "gateway_account_id"
  > & { psychologist: Pick<psychologist_profile, "id" | "user_id"> };
};

export type AdminInvoiceDownloadAudit = {
  adminId: string;
  invoiceId: string;
  userId: string;
  updatedAt: Date;
  subscriptionUpdatedAt: Date;
  mode: "test" | "live";
};

export interface IAdminInvoiceRepository {
  findForUser(id: string, userId: string): Promise<AdminInvoiceRecord | null>;
  recordPreparedDownload(input: AdminInvoiceDownloadAudit): Promise<boolean>;
}

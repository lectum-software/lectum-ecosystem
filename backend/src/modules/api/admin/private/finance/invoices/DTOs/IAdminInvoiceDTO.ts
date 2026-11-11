import type { Request } from "express";
import type { admin } from "@/interfaces/objects";

export type IAdminInvoiceDTO = Request & {
  p: { id: string };
  q: { user_id: string };
  admin: admin;
};

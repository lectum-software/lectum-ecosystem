import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { FeeObservationError } from "@/modules/billing/stripe/balance-observer/policy";
import { FinancialLedgerError } from "@/modules/billing/stripe/financial-ledger/policy";
import { FinanceLedgerFilterRequiredError } from "../../dashboard/repositories/AdminFinanceStripeLedgerRepository";
import { listAdminFees, observeAdminFees } from "./services";

async function respond(res: Response, action: () => Promise<{ status: number; data: unknown }>) {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    const result = await action();
    return send(res, { status: result.status, ...msg("index", {}), data: result.data });
  } catch (cause) {
    if (cause instanceof FinanceLedgerFilterRequiredError)
      return send(res, { status: 503, ...error("finance_history_filter_required", {}) });
    if (cause instanceof FinancialLedgerError)
      return send(res, { status: 503, ...error("fees_invalid_receipt", {}) });
    if (cause instanceof FeeObservationError)
      return send(res, {
        status:
          cause.code === "actor_invalid"
            ? 403
            : cause.code === "invalid_arguments"
              ? 400
              : cause.code === "receipt_not_found"
                ? 404
                : 503,
        ...error(`fees_${cause.code}`, {}),
      });
    return error500(res, "admin_stripe_fee_observation", cause);
  }
}
export const index = (req: Request, res: Response) =>
  respond(res, async () => ({ status: 200, data: await listAdminFees(req.admin.id, req.q ?? {}) }));
export const observe = (req: Request, res: Response) =>
  respond(res, () => observeAdminFees(req.admin.id, req.p.receiptId));

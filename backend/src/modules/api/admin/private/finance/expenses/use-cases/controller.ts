import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { ExpenseError } from "./policy";
import { correctExpense, createExpense, listExpenses, voidExpense } from "./services";

async function respond(res: Response, operation: () => Promise<unknown>, creating = false) {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    const data = await operation();
    const created =
      creating && data && typeof data === "object" && "replayed" in data && data.replayed === false;
    return send(res, { status: created ? 201 : 200, ...msg("index", {}), data });
  } catch (cause) {
    if (cause instanceof ExpenseError)
      return send(res, {
        status:
          cause.code === "expense_actor_invalid"
            ? 403
            : cause.code === "expense_not_found"
              ? 404
              : cause.code === "expense_invalid_input"
                ? 400
                : 409,
        ...error(cause.code, {}),
      });
    return error500(res, "admin_operating_expense", cause);
  }
}
export const index = (req: Request, res: Response) =>
  respond(res, () => listExpenses(req.admin.id, req.q ?? {}));
export const create = (req: Request, res: Response) =>
  respond(res, () => createExpense(req.admin.id, req.b), true);
export const correct = (req: Request, res: Response) =>
  respond(res, () => correctExpense(req.admin.id, req.p.id, req.b));
export const voidEntry = (req: Request, res: Response) =>
  respond(res, () => voidExpense(req.admin.id, req.p.id, req.b));

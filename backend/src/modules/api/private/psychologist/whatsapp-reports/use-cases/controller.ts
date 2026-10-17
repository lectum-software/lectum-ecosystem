import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { type ReportOperation, reportService } from "./services";

export const reportController =
  (operation: ReportOperation) => async (req: Request, res: Response) => {
    try {
      return send(
        res,
        await reportService(
          {
            auth: req.auth,
            p: { id: String(req.p?.id ?? req.params.id ?? "") },
            b: req.b ?? {},
          },
          operation,
        ),
      );
    } catch (err) {
      return error500(res, "whatsapp_reports", err);
    }
  };

import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import type { FeedbackInput } from "../DTOs";
import { submitFeedback } from "./services";

export async function create(req: Request, res: Response) {
  try {
    return send(
      res,
      await submitFeedback(
        req.auth.id,
        req.b as FeedbackInput,
        (req.files ?? []) as Express.Multer.File[],
      ),
    );
  } catch (err) {
    return error500(res, "feedback_create", err);
  }
}

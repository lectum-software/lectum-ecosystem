import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { error } from "@/helpers/translate";
import type { FeedbackQuery, FeedbackUpdate } from "@/modules/api/private/feedback/DTOs";
import { feedbackRepository } from "@/modules/api/private/feedback/use-cases/services";

export async function list(req: Request, res: Response) {
  try {
    return send(res, {
      success: true,
      data: await feedbackRepository.list(req.q as FeedbackQuery),
    });
  } catch (err) {
    return error500(res, "feedback_list", err);
  }
}
export async function count(_req: Request, res: Response) {
  try {
    return send(res, { success: true, data: { new_count: await feedbackRepository.count() } });
  } catch (err) {
    return error500(res, "feedback_count", err);
  }
}
export async function detail(req: Request, res: Response) {
  try {
    const data = await feedbackRepository.detail(String(req.p.id));
    return send(
      res,
      data ? { success: true, data } : { status: 404, ...error("feedback_missing") },
    );
  } catch (err) {
    return error500(res, "feedback_detail", err);
  }
}
export async function update(req: Request, res: Response) {
  try {
    const result = await feedbackRepository.update(
      String(req.p.id),
      req.admin.id,
      req.b as FeedbackUpdate,
    );
    return send(
      res,
      "error" in result
        ? {
            status: result.error === "feedback_missing" ? 404 : 409,
            ...error(result.error ?? "feedback_conflict"),
          }
        : { success: true, data: result },
    );
  } catch (err) {
    return error500(res, "feedback_update", err);
  }
}
export async function attachment(req: Request, res: Response) {
  try {
    const data = await feedbackRepository.attachment(String(req.p.id), String(req.p.attachmentId));
    if (!data) return send(res, { status: 404, ...error("feedback_missing") });
    res.set({
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": 'attachment; filename="captura.jpg"',
    });
    return res.send(Buffer.from(data.content));
  } catch (err) {
    return error500(res, "feedback_attachment", err);
  }
}

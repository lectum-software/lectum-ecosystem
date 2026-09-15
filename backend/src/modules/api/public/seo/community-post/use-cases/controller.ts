import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { showPost as showPostService, showReply as showReplyService } from "./services";

export const showPost = async (req: Request, res: Response) => {
  try {
    return send(
      res,
      await showPostService({
        id: String(req.params.id ?? ""),
        slug: String(req.params.slug ?? ""),
      }),
    );
  } catch (err) {
    return error500(res, "public_community_post_seo_show", err);
  }
};

export const showReply = async (req: Request, res: Response) => {
  try {
    return send(
      res,
      await showReplyService({
        id: String(req.params.id ?? ""),
        replyId: String(req.params.replyId ?? ""),
        slug: String(req.params.slug ?? ""),
      }),
    );
  } catch (err) {
    return error500(res, "public_community_post_reply_seo_show", err);
  }
};

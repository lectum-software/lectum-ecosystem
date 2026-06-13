import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  createReply as createReplyService,
  mine as mineService,
  replies as repliesService,
  saved as savedService,
  save as saveService,
  show as showService,
  unsave as unsaveService,
  vote as voteService,
} from "./services";

export const mine = async (req: Request, res: Response) => {
  try {
    const resolve = await mineService(req as unknown as Parameters<typeof mineService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_mine", err);
  }
};

export const saved = async (req: Request, res: Response) => {
  try {
    const resolve = await savedService(req as unknown as Parameters<typeof savedService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_saved_list", err);
  }
};

export const show = async (req: Request, res: Response) => {
  try {
    const resolve = await showService(req as unknown as Parameters<typeof showService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_show", err);
  }
};

export const replies = async (req: Request, res: Response) => {
  try {
    const resolve = await repliesService(req as unknown as Parameters<typeof repliesService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_replies", err);
  }
};

export const createReply = async (req: Request, res: Response) => {
  try {
    const resolve = await createReplyService(
      req as unknown as Parameters<typeof createReplyService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_create_reply", err);
  }
};

export const vote = async (req: Request, res: Response) => {
  try {
    const resolve = await voteService(req as unknown as Parameters<typeof voteService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_vote", err);
  }
};

export const save = async (req: Request, res: Response) => {
  try {
    const resolve = await saveService(req as unknown as Parameters<typeof saveService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_save", err);
  }
};

export const unsave = async (req: Request, res: Response) => {
  try {
    const resolve = await unsaveService(req as unknown as Parameters<typeof unsaveService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "post_unsave", err);
  }
};

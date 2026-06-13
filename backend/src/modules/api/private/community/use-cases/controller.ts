import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  feed as feedService,
  index as indexService,
  posts as postsService,
  suggest as suggestService,
} from "./services";

export const index = async (req: Request, res: Response) => {
  try {
    const resolve = await indexService(req as unknown as Parameters<typeof indexService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_index", err);
  }
};

export const suggest = async (req: Request, res: Response) => {
  try {
    const resolve = await suggestService(req as unknown as Parameters<typeof suggestService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_suggest", err);
  }
};

export const feed = async (req: Request, res: Response) => {
  try {
    const resolve = await feedService(req as unknown as Parameters<typeof feedService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_feed", err);
  }
};

export const posts = async (req: Request, res: Response) => {
  try {
    const resolve = await postsService(req as unknown as Parameters<typeof postsService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_posts", err);
  }
};

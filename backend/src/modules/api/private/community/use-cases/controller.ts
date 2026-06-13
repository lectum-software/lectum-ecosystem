import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  createPost as createPostService,
  feed as feedService,
  follow as followService,
  index as indexService,
  posts as postsService,
  show as showService,
  suggest as suggestService,
  unfollow as unfollowService,
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

export const show = async (req: Request, res: Response) => {
  try {
    const resolve = await showService(req as unknown as Parameters<typeof showService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_show", err);
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

export const follow = async (req: Request, res: Response) => {
  try {
    const resolve = await followService(req as unknown as Parameters<typeof followService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_follow", err);
  }
};

export const unfollow = async (req: Request, res: Response) => {
  try {
    const resolve = await unfollowService(req as unknown as Parameters<typeof unfollowService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_unfollow", err);
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

export const createPost = async (req: Request, res: Response) => {
  try {
    const resolve = await createPostService(
      req as unknown as Parameters<typeof createPostService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "community_create_post", err);
  }
};

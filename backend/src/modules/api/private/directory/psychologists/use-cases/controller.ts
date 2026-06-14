import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import service, {
  contactClick as contactClickService,
  contact as contactService,
  posts as postsService,
  reviews as reviewsService,
  show as showService,
} from "./services";

export const index = async (req: Request, res: Response) => {
  try {
    const resolve = await service(req as unknown as Parameters<typeof service>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "directory_psychologists_index", err);
  }
};

export const show = async (req: Request, res: Response) => {
  try {
    const resolve = await showService(req as unknown as Parameters<typeof showService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "directory_psychologists_show", err);
  }
};

export const posts = async (req: Request, res: Response) => {
  try {
    const resolve = await postsService(req as unknown as Parameters<typeof postsService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "directory_psychologists_posts", err);
  }
};

export const reviews = async (req: Request, res: Response) => {
  try {
    const resolve = await reviewsService(req as unknown as Parameters<typeof reviewsService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "directory_psychologists_reviews", err);
  }
};

export const contact = async (req: Request, res: Response) => {
  try {
    const resolve = await contactService(req as unknown as Parameters<typeof contactService>[0]);

    return send(res, resolve);
  } catch (err) {
    return error500(res, "directory_psychologists_contact", err);
  }
};

export const contactClick = async (req: Request, res: Response) => {
  try {
    const resolve = await contactClickService(
      req as unknown as Parameters<typeof contactClickService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "directory_psychologists_contact_click", err);
  }
};

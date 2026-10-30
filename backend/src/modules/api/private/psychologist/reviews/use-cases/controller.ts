import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  index as indexService,
  removeResponse as removeResponseService,
  respond as respondService,
  visibility as visibilityService,
} from "./services";

export const visibility = async (req: Request, res: Response) => {
  try {
    return send(
      res,
      await visibilityService(req as unknown as Parameters<typeof visibilityService>[0]),
    );
  } catch (err) {
    return error500(res, "testimonial_visibility", err);
  }
};
export const removeResponse = async (req: Request, res: Response) => {
  try {
    return send(
      res,
      await removeResponseService(req as unknown as Parameters<typeof removeResponseService>[0]),
    );
  } catch (err) {
    return error500(res, "testimonial_response_delete", err);
  }
};

export const index = async (req: Request, res: Response) => {
  try {
    return send(res, await indexService(req as unknown as Parameters<typeof indexService>[0]));
  } catch (err) {
    return error500(res, "psychologist_review_index", err);
  }
};

export const respond = async (req: Request, res: Response) => {
  try {
    return send(res, await respondService(req as unknown as Parameters<typeof respondService>[0]));
  } catch (err) {
    return error500(res, "psychologist_review_respond", err);
  }
};

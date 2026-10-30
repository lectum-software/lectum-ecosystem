import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { pending as pendingService } from "./services";

export const pending = async (req: Request, res: Response) => {
  try {
    return send(res, await pendingService(req as unknown as Parameters<typeof pendingService>[0]));
  } catch (err) {
    return error500(res, "patient_testimonial_pending", err);
  }
};

import {
  destroy as destroyService,
  eligibility as eligibilityService,
  index as indexService,
  store as storeService,
  update as updateService,
} from "./services";

export const update = async (req: Request, res: Response) => {
  try {
    return send(res, await updateService(req as unknown as Parameters<typeof updateService>[0]));
  } catch (err) {
    return error500(res, "patient_testimonial_update", err);
  }
};

export const destroy = async (req: Request, res: Response) => {
  try {
    return send(res, await destroyService(req as unknown as Parameters<typeof destroyService>[0]));
  } catch (err) {
    return error500(res, "patient_review_delete", err);
  }
};

export const index = async (req: Request, res: Response) => {
  try {
    return send(res, await indexService(req as unknown as Parameters<typeof indexService>[0]));
  } catch (err) {
    return error500(res, "patient_review_index", err);
  }
};

export const eligibility = async (req: Request, res: Response) => {
  try {
    return send(
      res,
      await eligibilityService(req as unknown as Parameters<typeof eligibilityService>[0]),
    );
  } catch (err) {
    return error500(res, "patient_review_eligibility", err);
  }
};

export const store = async (req: Request, res: Response) => {
  try {
    return send(res, await storeService(req as unknown as Parameters<typeof storeService>[0]));
  } catch (err) {
    return error500(res, "patient_review_store", err);
  }
};

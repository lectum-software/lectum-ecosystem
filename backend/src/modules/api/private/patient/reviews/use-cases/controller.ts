import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  eligibility as eligibilityService,
  index as indexService,
  store as storeService,
} from "./services";

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

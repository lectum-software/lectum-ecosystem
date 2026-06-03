import type { RefinementCtx } from "zod";
import type { IValidationParams } from "../validations/types";

export type RefineRelation = {
  keys: IValidationParams[];
  ctx: RefinementCtx;
  cont: any;
};

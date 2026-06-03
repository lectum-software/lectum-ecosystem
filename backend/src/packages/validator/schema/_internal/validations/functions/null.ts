//Types
import type { IValidationParams } from "../types";
import { z } from "../zod";

export default ({}: IValidationParams) => {
  return z.preprocess((a) => {
    return a && null;
  }, z.null());
};

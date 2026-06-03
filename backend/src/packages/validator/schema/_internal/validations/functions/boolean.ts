//Types
import type { IValidationParams } from "../types";
import { z } from "../zod";

export default ({}: IValidationParams) => {
  return z.preprocess((a) => {
    if (a && typeof a === "string") {
      if (a.toLowerCase() === "true" || a.toLowerCase() === "1") {
        return true;
      } else if (a.toLowerCase() === "false" || a.toLowerCase() === "0") {
        return false;
      } else {
        return a;
      }
    } else {
      return a;
    }
  }, z.boolean());
};

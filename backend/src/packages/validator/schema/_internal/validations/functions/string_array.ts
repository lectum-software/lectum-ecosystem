//Types
import type { IValidationParams } from "../types";
import { z } from "../zod";

export default ({}: IValidationParams) => {
  return z.preprocess((value) => {
    if (Array.isArray(value)) return value;
    else if (typeof value === "string") return value?.split(",");
    return value;
  }, z.array(z.string()));
};

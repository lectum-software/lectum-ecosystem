//Types
import type { IValidationParams } from "../types";
import { z } from "../zod";

export default ({}: IValidationParams) => {
  const currentYear = new Date().getFullYear() + 1;

  return z.preprocess((a) => a && Number(a), z.number().int().positive().min(999).max(currentYear));
};

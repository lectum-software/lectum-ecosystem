//Types
import type { IValidationParams } from "../types";
import { z } from "../zod";

export default ({ int, positive, max, min }: IValidationParams) => {
  min = min ? Number(min) : undefined;
  max = max ? Number(max) : undefined;

  let baseSchema = z.number({});

  if (int) {
    baseSchema = baseSchema.int({});
  }

  if (positive) {
    baseSchema = baseSchema.positive({});
  }

  if (max !== undefined) {
    baseSchema = baseSchema.max(max, {});
  }

  if (min !== undefined) {
    baseSchema = baseSchema.min(min, {});
  }

  return z.preprocess((a) => (a !== undefined && a !== null ? Number(a) : a), baseSchema);
};

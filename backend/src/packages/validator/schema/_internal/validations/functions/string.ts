//Types
import type { IValidationParams } from "../types";
import { z } from "../zod";

export default ({ max, min, format }: IValidationParams) => {
  min = min ? Number(min) : undefined;
  max = max ? Number(max) : undefined;

  let schema = z.string({});

  if (min !== undefined) {
    schema = schema.min(min);
  }

  if (max !== undefined) {
    schema = schema.max(max);
  }

  return schema.transform((value) => {
    if (format === "upper") return value.toUpperCase();
    if (format === "lower") return value.toLowerCase();
    return value;
  });
};

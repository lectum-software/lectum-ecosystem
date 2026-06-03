//Types
import type { IValidationParams } from "../types";
import { z } from "../zod";

export default ({ values = [] }: IValidationParams) => {
  if (values.length === 0) {
    throw new Error("Enum validation requires at least one value");
  }

  return z.enum(values as [string, ...string[]]);
};

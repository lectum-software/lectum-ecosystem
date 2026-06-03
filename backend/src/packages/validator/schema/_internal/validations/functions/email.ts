import { custom } from "../../../../schema/_internal/handlers/custom";
//Types
import type { IValidationParams } from "../types";
import { z } from "../zod";

export default ({}: IValidationParams) => {
  return z
    .string({})
    .refine(
      (value) => {
        if (!value.toString()) return true;
        const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        return regex.test(value);
      },
      { message: custom("invalid_email") },
    )
    .transform((email) => email.toLowerCase());
};

import { custom } from "../../../../schema/_internal/handlers/custom";
//Types
import type { IValidationParams } from "../types";
import { z } from "../zod";

const emailSchema = z.email();

export default ({}: IValidationParams) => {
  return z
    .string({})
    .refine(
      (value) => {
        // Vazio continua sob responsabilidade dos modificadores obrigatório/opcional.
        if (!value) return true;
        return value === value.trim() && emailSchema.safeParse(value).success;
      },
      { message: custom("invalid_string.email") },
    )
    .transform((email) => email.toLowerCase());
};

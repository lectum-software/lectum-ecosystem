import { custom } from "../../../../schema/_internal/handlers/custom";
//Types
import type { IValidationParams } from "../types";
import { z } from "../zod";

export default ({ min = "12", max = "128" }: IValidationParams) => {
  return z
    .string()
    .min(Number(min), { message: custom("password_too_short", { min }) })
    .max(Number(max), { message: custom("password_too_long", { max }) })
    .regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/, {
      message: custom("password_too_weak"),
    });
};

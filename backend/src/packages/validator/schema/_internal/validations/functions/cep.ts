import { custom } from "../../../../schema/_internal/handlers/custom";

//Types
import type { IValidationParams } from "../types";
import { z } from "../zod";

export default ({}: IValidationParams) => {
  return z.string().regex(/^\d{5}-\d{3}$/, { message: custom("invalid_cep") });
};

import { parsePhoneNumberFromString } from "libphonenumber-js";
import { custom } from "../../../../schema/_internal/handlers/custom";

//Types
import type { IValidationParams } from "../types";
import { z } from "../zod";

export default ({}: IValidationParams) => {
  return z.string().refine(
    (phone) => {
      if (!phone) return true;
      const parsed = parsePhoneNumberFromString(phone);

      return parsed !== undefined && parsed.isValid();
    },
    { message: custom("invalid_phone") },
  );
};

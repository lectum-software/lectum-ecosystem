import { isValid } from "date-fns";
import { custom } from "../../../../schema/_internal/handlers/custom";

//Types
import type { IValidationParams } from "../types";
import { z } from "../zod";

export default ({ min_today, max_today }: IValidationParams) => {
  const day = new Date();

  let schema = z.date({
    error: custom("invalid_date"),
  });

  if (min_today) {
    schema = schema.min(day);
  }

  if (max_today) {
    schema = schema.max(day);
  }

  return z.preprocess((a: any) => {
    const isNotNull = a !== null;
    const isNotUndefined = a !== undefined;
    const isNotEmpty = a !== "";

    const isDate = isValid(new Date(a));

    const pass = isNotNull && isNotUndefined && isNotEmpty && isDate;

    return pass ? new Date(a) : a;
  }, schema);
};

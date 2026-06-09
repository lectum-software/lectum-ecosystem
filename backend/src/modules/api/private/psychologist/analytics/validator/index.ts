import { type IValidatorRequest, validator } from "@/utils/validator";

export const indexSchema: IValidatorRequest = {
  query: [{ key: "period", coerse: "string", method: "string", max: 8, optional: true }],
};

export const indexValidator = validator(indexSchema);

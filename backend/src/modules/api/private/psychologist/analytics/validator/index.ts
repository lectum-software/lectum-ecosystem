import { type IValidatorRequest, validator } from "@/utils/validator";

export const indexSchema: IValidatorRequest = {
  query: [
    { key: "period", coerse: "string", method: "string", max: 10, optional: true },
    { key: "start_at", coerse: "string", method: "string", max: 10, optional: true },
    { key: "end_at", coerse: "string", method: "string", max: 10, optional: true },
  ],
};

export const indexValidator = validator(indexSchema);

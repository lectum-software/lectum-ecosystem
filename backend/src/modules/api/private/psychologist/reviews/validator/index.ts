import { type IValidatorRequest, validator } from "@/utils/validator";

export const indexSchema: IValidatorRequest = {
  query: [
    {
      key: "limit",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      max: 50,
      optional: true,
    },
    { key: "page", coerse: "number", method: "numeric", int: true, positive: true, optional: true },
    {
      key: "rating",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      min: 1,
      max: 5,
      optional: true,
    },
    { key: "period", coerse: "string", method: "string", max: 8, optional: true },
  ],
};

export const respondSchema: IValidatorRequest = {
  params: [{ key: "id", coerse: "string", method: "string" }],
  body: [{ key: "response", coerse: "string", method: "string", max: 1000 }],
};

export const indexValidator = validator(indexSchema);
export const respondValidator = validator(respondSchema);

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
  ],
};

export const eligibilitySchema: IValidatorRequest = {
  params: [{ key: "id", coerse: "string", method: "string" }],
};

export const storeSchema: IValidatorRequest = {
  body: [
    { key: "psychologist_id", coerse: "string", method: "string" },
    {
      key: "rating",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      min: 1,
      max: 5,
    },
    {
      key: "comment",
      coerse: "string",
      method: "string",
      max: 1000,
    },
  ],
};

export const indexValidator = validator(indexSchema);
export const eligibilityValidator = validator(eligibilitySchema);
export const storeValidator = validator(storeSchema);

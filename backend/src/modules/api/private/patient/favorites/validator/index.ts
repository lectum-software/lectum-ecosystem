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
    {
      key: "page",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      optional: true,
    },
    {
      key: "search",
      coerse: "string",
      method: "string",
      max: 120,
      optional: true,
    },
    {
      key: "available_today",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
    {
      key: "accepts_insurance",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
    {
      key: "social_value",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
    {
      key: "discount_first_session",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
    {
      key: "more_experienced",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
    {
      key: "verified",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
  ],
};

export const actionSchema: IValidatorRequest = {
  params: [
    {
      key: "id",
      coerse: "string",
      method: "string",
    },
  ],
};

export const indexValidator = validator(indexSchema);
export const actionValidator = validator(actionSchema);

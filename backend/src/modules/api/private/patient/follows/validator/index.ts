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

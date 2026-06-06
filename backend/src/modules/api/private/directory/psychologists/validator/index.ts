import { type IValidatorRequest, validator } from "@/utils/validator";

export const schema: IValidatorRequest = {
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
      key: "specialty",
      coerse: "string",
      method: "string",
      max: 100,
      format: "lower",
      optional: true,
    },
    {
      key: "service",
      coerse: "string",
      method: "string",
      max: 100,
      format: "lower",
      optional: true,
    },
    {
      key: "approach",
      coerse: "string",
      method: "string",
      max: 100,
      format: "lower",
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

export default validator(schema);

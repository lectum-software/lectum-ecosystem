import { type IValidatorRequest, validator } from "@/utils/validator";

export const schema: IValidatorRequest = {
  query: [
    {
      key: "page",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      optional: true,
    },
    {
      key: "limit",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      max: 50,
      optional: true,
    },
    { key: "q", coerse: "string", method: "string", max: 120, optional: true },
    { key: "status", coerse: "string", method: "string", max: 20, optional: true },
    { key: "provider", coerse: "string", method: "string", max: 40, optional: true },
    { key: "gender", coerse: "string", method: "string", max: 80, optional: true },
    { key: "intent_engagement", coerse: "string", method: "string", max: 80, optional: true },
    { key: "sort", coerse: "string", method: "string", max: 40, optional: true },
  ],
};

export default validator(schema);

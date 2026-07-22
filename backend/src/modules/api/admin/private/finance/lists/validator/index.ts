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
    { key: "from", coerse: "string", method: "string", max: 10, optional: true },
    { key: "to", coerse: "string", method: "string", max: 10, optional: true },
    { key: "groupBy", coerse: "string", method: "string", max: 5, optional: true },
    { key: "period", coerse: "string", method: "string", max: 10, optional: true },
  ],
};

export default validator(schema);

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
    { key: "state", coerse: "string", method: "string", max: 2, format: "upper", optional: true },
    { key: "city", coerse: "string", method: "string", max: 120, optional: true },
    {
      key: "status",
      coerse: "string",
      method: "string",
      max: 40,
      optional: true,
    },
    { key: "plan", coerse: "string", method: "string", max: 80, optional: true },
    {
      key: "experience",
      coerse: "string",
      method: "string",
      max: 40,
      optional: true,
    },
    {
      key: "discount_first_session",
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
    { key: "social_value", coerse: "boolean", method: "boolean", optional: true },
    {
      key: "target_audience",
      coerse: "string",
      method: "string",
      max: 80,
      optional: true,
    },
    { key: "approach", coerse: "string", method: "string", max: 100, optional: true },
    { key: "service", coerse: "string", method: "string", max: 100, optional: true },
    { key: "modality", coerse: "string", method: "string", max: 40, optional: true },
    { key: "language", coerse: "string", method: "string", max: 80, optional: true },
    { key: "gender", coerse: "string", method: "string", max: 80, optional: true },
    {
      key: "sort",
      coerse: "string",
      method: "string",
      max: 40,
      optional: true,
    },
  ],
};

export default validator(schema);

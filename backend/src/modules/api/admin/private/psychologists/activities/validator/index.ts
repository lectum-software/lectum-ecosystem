import { type IValidatorRequest, validator } from "@/utils/validator";

const psychologistParam = {
  key: "id",
  coerse: "string",
  method: "string",
  min: 1,
  max: 120,
} satisfies NonNullable<IValidatorRequest["params"]>[number];

export const activitiesSchema: IValidatorRequest = {
  params: [psychologistParam],
  query: [
    { key: "area", coerse: "string", method: "string", max: 40, optional: true },
    { key: "from", coerse: "string", method: "string", max: 10, optional: true },
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
      max: 9999,
      optional: true,
    },
    { key: "q", coerse: "string", method: "string", max: 160, optional: true },
    { key: "to", coerse: "string", method: "string", max: 10, optional: true },
    { key: "type", coerse: "string", method: "string", max: 60, optional: true },
  ],
};

export const activitiesValidator = validator(activitiesSchema);

import { type IValidatorRequest, validator } from "@/utils/validator";

const psychologistParam = {
  key: "id",
  coerse: "string",
  method: "string",
  min: 1,
  max: 120,
} satisfies NonNullable<IValidatorRequest["params"]>[number];

const periodQuery: NonNullable<IValidatorRequest["query"]> = [
  { key: "from", coerse: "string", method: "string", max: 10, optional: true },
  { key: "to", coerse: "string", method: "string", max: 10, optional: true },
];

export const statisticsSchema: IValidatorRequest = {
  params: [psychologistParam],
  query: periodQuery,
};

export const publicationsSchema: IValidatorRequest = {
  params: [psychologistParam],
  query: [
    ...periodQuery,
    { key: "community", coerse: "string", method: "string", max: 120, optional: true },
    {
      key: "limit",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      max: 20,
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
    { key: "q", coerse: "string", method: "string", max: 120, optional: true },
    { key: "type", coerse: "string", method: "string", max: 20, optional: true },
  ],
};

export const statisticsValidator = validator(statisticsSchema);
export const publicationsValidator = validator(publicationsSchema);

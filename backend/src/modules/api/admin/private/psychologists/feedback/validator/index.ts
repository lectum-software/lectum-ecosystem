import { type IValidatorRequest, validator } from "@/utils/validator";

const psychologistParam = {
  key: "id",
  coerse: "string",
  method: "string",
  min: 1,
  max: 120,
} satisfies NonNullable<IValidatorRequest["params"]>[number];

const paginationQuery: NonNullable<IValidatorRequest["query"]> = [
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
];

export const reviewsSchema: IValidatorRequest = {
  params: [psychologistParam],
  query: [
    ...paginationQuery,
    {
      key: "rating",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      max: 5,
      optional: true,
    },
    { key: "status", coerse: "string", method: "string", max: 40, optional: true },
  ],
};

export const reportsSchema: IValidatorRequest = {
  params: [psychologistParam],
  query: [
    ...paginationQuery,
    { key: "from", coerse: "string", method: "string", max: 10, optional: true },
    { key: "status", coerse: "string", method: "string", max: 40, optional: true },
    { key: "to", coerse: "string", method: "string", max: 10, optional: true },
    { key: "type", coerse: "string", method: "string", max: 20, optional: true },
  ],
};

export const reviewsValidator = validator(reviewsSchema);
export const reportsValidator = validator(reportsSchema);

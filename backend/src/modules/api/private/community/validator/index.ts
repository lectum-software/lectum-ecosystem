import { type IValidatorRequest, validator } from "@/utils/validator";

const paginationQuery = [
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
] satisfies IValidatorRequest["query"];

export const indexSchema: IValidatorRequest = {
  query: [
    ...paginationQuery,
    {
      key: "search",
      coerse: "string",
      method: "string",
      max: 120,
      optional: true,
    },
    {
      key: "category",
      coerse: "string",
      method: "string",
      max: 120,
      optional: true,
    },
  ],
};

export const suggestionSchema: IValidatorRequest = {
  body: [
    {
      key: "theme",
      coerse: "string",
      method: "string",
      min: 3,
      max: 240,
    },
  ],
};

export const feedSchema: IValidatorRequest = {
  query: [
    ...paginationQuery,
    {
      key: "search",
      coerse: "string",
      method: "string",
      max: 120,
      optional: true,
    },
    {
      key: "community",
      coerse: "string",
      method: "string",
      min: 1,
      max: 120,
      format: "lower",
      optional: true,
    },
    {
      key: "scope",
      coerse: "string",
      method: "string",
      max: 20,
      optional: true,
    },
  ],
};

export const postsSchema: IValidatorRequest = {
  params: [
    {
      key: "slug",
      coerse: "string",
      method: "string",
      min: 1,
      max: 120,
      format: "lower",
    },
  ],
  query: [
    ...paginationQuery,
    {
      key: "search",
      coerse: "string",
      method: "string",
      max: 120,
      optional: true,
    },
  ],
};

export const indexValidator = validator(indexSchema);
export const feedValidator = validator(feedSchema);
export const suggestionValidator = validator(suggestionSchema);
export const postsValidator = validator(postsSchema);

export default indexValidator;

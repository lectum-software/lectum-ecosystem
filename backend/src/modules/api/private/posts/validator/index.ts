import { type IValidatorRequest, validator } from "@/utils/validator";

const idParams = [
  {
    key: "id",
    coerse: "string",
    method: "string",
    min: 1,
    max: 120,
  },
] satisfies IValidatorRequest["params"];

const paginationQuery = [
  {
    key: "limit",
    coerse: "number",
    method: "numeric",
    int: true,
    positive: true,
    max: 30,
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

export const showSchema: IValidatorRequest = {
  params: idParams,
};

export const repliesSchema: IValidatorRequest = {
  params: idParams,
  query: paginationQuery,
};

export const listSchema: IValidatorRequest = {
  query: [
    ...paginationQuery,
    {
      key: "type",
      coerse: "string",
      method: "string",
      min: 1,
      max: 16,
      optional: true,
    },
  ],
};

export const createReplySchema: IValidatorRequest = {
  params: idParams,
  body: [
    {
      key: "content",
      coerse: "string",
      method: "string",
      min: 3,
      max: 2000,
    },
    {
      key: "parentReplyId",
      coerse: "string",
      method: "string",
      min: 1,
      max: 120,
      optional: true,
    },
  ],
};

export const voteSchema: IValidatorRequest = {
  params: idParams,
  body: [
    {
      key: "value",
      coerse: "number",
      method: "numeric",
      int: true,
    },
    {
      key: "replyId",
      coerse: "string",
      method: "string",
      min: 1,
      max: 120,
      optional: true,
    },
  ],
};

export const showValidator = validator(showSchema);
export const repliesValidator = validator(repliesSchema);
export const listValidator = validator(listSchema);
export const createReplyValidator = validator(createReplySchema);
export const voteValidator = validator(voteSchema);
export const saveValidator = validator(showSchema);

export default showValidator;

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

const replyIdParams = [
  ...idParams,
  {
    key: "replyId",
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
  query: [
    ...paginationQuery,
    {
      key: "focusReplyId",
      coerse: "string",
      method: "string",
      min: 1,
      max: 120,
      optional: true,
    },
  ],
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
    {
      key: "mediaUrl",
      coerse: "string",
      method: "string",
      min: 1,
      max: 500,
      optional: true,
    },
    {
      key: "mediaType",
      coerse: "string",
      method: "string",
      min: 3,
      max: 16,
      optional: true,
    },
  ],
};

export const updatePostSchema: IValidatorRequest = {
  params: idParams,
  body: [
    {
      key: "title",
      coerse: "string",
      method: "string",
      min: 3,
      max: 140,
    },
    {
      key: "content",
      coerse: "string",
      method: "string",
      min: 10,
      max: 2000,
    },
    {
      key: "mediaUrl",
      coerse: "string",
      method: "string",
      min: 1,
      max: 500,
      optional: true,
      nullable: true,
    },
    {
      key: "mediaType",
      coerse: "string",
      method: "enumeric",
      values: ["image", "video"],
      optional: true,
      nullable: true,
    },
  ],
};

export const updateReplySchema: IValidatorRequest = {
  params: replyIdParams,
  body: [
    {
      key: "content",
      coerse: "string",
      method: "string",
      min: 3,
      max: 2000,
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

export const replySaveSchema: IValidatorRequest = {
  params: replyIdParams,
};

export const reportSchema: IValidatorRequest = {
  params: idParams,
  body: [
    {
      key: "reason",
      coerse: "string",
      method: "string",
      min: 2,
      max: 60,
    },
    {
      key: "description",
      coerse: "string",
      method: "string",
      min: 1,
      max: 500,
      optional: true,
    },
  ],
};

export const replyReportSchema: IValidatorRequest = {
  params: replyIdParams,
  body: reportSchema.body,
};

export const showValidator = validator(showSchema);
export const repliesValidator = validator(repliesSchema);
export const listValidator = validator(listSchema);
export const createReplyValidator = validator(createReplySchema);
export const updatePostValidator = validator(updatePostSchema);
export const updateReplyValidator = validator(updateReplySchema);
export const voteValidator = validator(voteSchema);
export const saveValidator = validator(showSchema);
export const replySaveValidator = validator(replySaveSchema);
export const reportValidator = validator(reportSchema);
export const replyReportValidator = validator(replyReportSchema);

export default showValidator;

import { type IValidatorRequest, validator } from "@/utils/validator";

const postParams = [
  {
    key: "slug",
    coerse: "string",
    method: "string",
    min: 1,
    max: 120,
  },
  {
    key: "id",
    coerse: "string",
    method: "string",
    min: 1,
    max: 120,
  },
] satisfies IValidatorRequest["params"];

const replyParams = [
  ...postParams,
  {
    key: "replyId",
    coerse: "string",
    method: "string",
    min: 1,
    max: 120,
  },
] satisfies IValidatorRequest["params"];

export const showPostValidator = validator({ params: postParams });
export const showReplyValidator = validator({ params: replyParams });

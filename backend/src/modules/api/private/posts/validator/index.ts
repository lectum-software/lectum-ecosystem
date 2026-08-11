import { z } from "zod";
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
      max: 2000,
      optional: true,
      nullable: true,
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
    {
      key: "thumbnailUrl",
      coerse: "string",
      method: "string",
      min: 1,
      max: 500,
      optional: true,
    },
  ],
};

export const replyMediaMultipartInitiateSchema: IValidatorRequest = {
  params: idParams,
  body: [
    {
      key: "fileName",
      coerse: "string",
      method: "string",
      min: 1,
      max: 255,
      optional: true,
    },
    {
      key: "mimeType",
      coerse: "string",
      method: "string",
      min: 3,
      max: 80,
    },
    {
      key: "size",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      max: 200 * 1024 * 1024,
    },
  ],
};

export const replyMediaMultipartCompleteSchema: IValidatorRequest = {
  params: idParams,
  body: [
    {
      key: "uploadSessionId",
      coerse: "string",
      method: "string",
      min: 1,
      max: 4096,
    },
    {
      key: "parts",
      custom: z
        .array(
          z
            .object({
              partId: z.string().min(1).max(4096).optional(),
              partNumber: z.number().int().min(1).max(10_000),
              partToken: z.string().min(1).max(4096).optional(),
            })
            .strict()
            .refine((part) => Boolean(part.partId || part.partToken), {
              message: "Informe a parte enviada.",
              path: ["partId"],
            }),
        )
        .min(1)
        .max(10_000),
    },
  ],
};

export const replyMediaMultipartAbortSchema: IValidatorRequest = {
  params: idParams,
  body: [
    {
      key: "uploadSessionId",
      coerse: "string",
      method: "string",
      min: 1,
      max: 4096,
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
      max: 100,
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
    {
      key: "thumbnailUrl",
      coerse: "string",
      method: "string",
      min: 1,
      max: 500,
      optional: true,
      nullable: true,
    },
    {
      key: "mediaItems",
      custom: z
        .array(
          z
            .object({
              mediaUrl: z.string().min(1).max(500),
              mediaType: z.literal("image"),
              position: z.number().int().min(0).max(9).optional(),
            })
            .strict(),
        )
        .max(10)
        .optional()
        .nullable(),
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
      max: 2000,
      optional: true,
      nullable: true,
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
    {
      key: "thumbnailUrl",
      coerse: "string",
      method: "string",
      min: 1,
      max: 500,
      optional: true,
      nullable: true,
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

export const shareSchema: IValidatorRequest = {
  params: idParams,
  body: [
    {
      key: "channel",
      coerse: "string",
      method: "enumeric",
      values: ["clipboard", "web_share"],
      optional: true,
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

export const replyShareSchema: IValidatorRequest = {
  params: replyIdParams,
  body: [
    {
      key: "channel",
      coerse: "string",
      method: "enumeric",
      values: ["clipboard", "web_share"],
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
export const replyMediaMultipartInitiateValidator = validator(replyMediaMultipartInitiateSchema);
export const replyMediaMultipartCompleteValidator = validator(replyMediaMultipartCompleteSchema);
export const replyMediaMultipartAbortValidator = validator(replyMediaMultipartAbortSchema);
export const updatePostValidator = validator(updatePostSchema);
export const updateReplyValidator = validator(updateReplySchema);
export const voteValidator = validator(voteSchema);
export const shareValidator = validator(shareSchema);
export const replyShareValidator = validator(replyShareSchema);
export const saveValidator = validator(showSchema);
export const replySaveValidator = validator(replySaveSchema);
export const reportValidator = validator(reportSchema);
export const replyReportValidator = validator(replyReportSchema);

export default showValidator;

import { z } from "zod";
import { UPLOAD_LIMITS } from "@/config/multer/limits";
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

const communitySlugParams = [
  {
    key: "slug",
    coerse: "string",
    method: "string",
    min: 1,
    max: 120,
    format: "lower",
  },
] satisfies IValidatorRequest["params"];

const multipartSessionIdField = {
  key: "uploadSessionId",
  coerse: "string",
  method: "string",
  min: 1,
  max: 4096,
} satisfies NonNullable<IValidatorRequest["body"]>[number];

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
    {
      key: "scope",
      coerse: "string",
      method: "string",
      max: 20,
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
    {
      key: "sort",
      coerse: "string",
      method: "enumeric",
      values: ["featured", "new", "commented", "voted"],
      optional: true,
    },
    {
      key: "period",
      coerse: "string",
      method: "enumeric",
      values: ["week", "month", "year", "all"],
      optional: true,
    },
  ],
};

export const topMentorsSchema: IValidatorRequest = {
  query: [
    {
      key: "period",
      coerse: "string",
      method: "enumeric",
      values: ["30d", "90d", "all"],
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
      key: "limit",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      max: 10,
      optional: true,
    },
  ],
};

export const showSchema: IValidatorRequest = {
  params: communitySlugParams,
};

export const createPostSchema: IValidatorRequest = {
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
      key: "anonymous",
      coerse: "boolean",
      method: "boolean",
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
      method: "enumeric",
      values: ["image", "video"],
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
        .optional(),
    },
  ],
};

export const postMediaMultipartInitiateSchema: IValidatorRequest = {
  params: communitySlugParams,
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
      max: UPLOAD_LIMITS.community.postMediaMultipartTotalMb * 1024 * 1024,
    },
  ],
};

export const postMediaMultipartPartSchema: IValidatorRequest = {
  params: communitySlugParams,
  body: [
    multipartSessionIdField,
    {
      key: "partNumber",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      max: 10_000,
    },
  ],
};

export const postMediaMultipartCompleteSchema: IValidatorRequest = {
  params: communitySlugParams,
  body: [
    multipartSessionIdField,
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

export const postMediaMultipartAbortSchema: IValidatorRequest = {
  params: communitySlugParams,
  body: [multipartSessionIdField],
};

export const indexValidator = validator(indexSchema);
export const feedValidator = validator(feedSchema);
export const topMentorsValidator = validator(topMentorsSchema);
export const suggestionValidator = validator(suggestionSchema);
export const showValidator = validator(showSchema);
export const membershipValidator = validator(showSchema);
export const postsValidator = validator(postsSchema);
export const createPostValidator = validator(createPostSchema);
export const postMediaMultipartInitiateValidator = validator(postMediaMultipartInitiateSchema);
export const postMediaMultipartPartValidator = validator(postMediaMultipartPartSchema);
export const postMediaMultipartCompleteValidator = validator(postMediaMultipartCompleteSchema);
export const postMediaMultipartAbortValidator = validator(postMediaMultipartAbortSchema);

export default indexValidator;

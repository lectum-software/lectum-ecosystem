import { VIDEO_ASSET_PURPOSES } from "@/infra/video-stream";
import { type IValidatorRequest, validator } from "@/utils/validator";

const assetParams = [
  {
    key: "id",
    coerse: "string",
    method: "string",
    min: 8,
    max: 64,
  },
] satisfies NonNullable<IValidatorRequest["params"]>;

export const uploadValidator = validator({
  body: [
    {
      key: "purpose",
      coerse: "string",
      method: "enumeric",
      values: [...VIDEO_ASSET_PURPOSES],
    },
    {
      key: "contextId",
      coerse: "string",
      method: "string",
      min: 1,
      max: 160,
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
      max: 5 * 1024 * 1024 * 1024,
    },
  ],
} satisfies IValidatorRequest);

export const actionValidator = validator({
  params: assetParams,
} satisfies IValidatorRequest);

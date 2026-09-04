import { VIDEO_ASSET_PURPOSES } from "@/infra/video-stream";
import { videoAssetActionValidator } from "@/modules/video-assets/http-validation";
import { type IValidatorRequest, validator } from "@/utils/validator";

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

export const actionValidator = videoAssetActionValidator;

import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";
import { VIDEO_ASSET_PURPOSES } from "@/infra/video-stream";
import { videoAssetActionValidator } from "@/modules/video-assets/http-validation";
import { videoUploadClientEventSchema } from "@/modules/video-assets/upload-diagnostics-policy";
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

const uploadEventIdSchema = z.string().min(8).max(64);
const uploadEventRequestSchema = z.object({
  body: videoUploadClientEventSchema,
  params: z.object({ id: uploadEventIdSchema }).strict(),
  query: z.object({}).strict(),
});

const validateUploadEvent = validator({
  params: [{ key: "id", custom: uploadEventIdSchema }],
  body: Object.entries(videoUploadClientEventSchema.shape).map(([key, custom]) => ({
    key,
    custom,
    optional: custom.isOptional(),
  })),
} satisfies IValidatorRequest);

export const uploadEventValidator = (
  req: Request & { schema?: boolean },
  res: Response,
  next: NextFunction,
) => {
  // Keep the shared validator's aliases and Swagger introspection. Reject before
  // its legacy 400 response so diagnostics return a closed, non-reflective 422.
  if (
    !req.schema &&
    !uploadEventRequestSchema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query ?? {},
    }).success
  ) {
    return send(res, { status: 422, ...error("invalid_structure", {}) });
  }

  return validateUploadEvent(req, res, next);
};

import { z } from "zod";
import { UPLOAD_LIMITS } from "@/config/multer/limits";
import { type IValidatorRequest, validator } from "@/utils/validator";

const sessionIdField = {
  key: "uploadSessionId",
  coerse: "string",
  method: "string",
  min: 1,
  max: 4096,
} satisfies NonNullable<IValidatorRequest["body"]>[number];

const videoMultipartInitiateSchema: IValidatorRequest = {
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
      max: UPLOAD_LIMITS.psychologist.videoMultipartTotalMb * 1024 * 1024,
    },
  ],
};

const videoMultipartPartSchema: IValidatorRequest = {
  body: [
    sessionIdField,
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

const videoMultipartCompleteSchema: IValidatorRequest = {
  body: [
    sessionIdField,
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

const videoMultipartAbortSchema: IValidatorRequest = {
  body: [sessionIdField],
};

export const videoMultipartInitiateValidator = validator(videoMultipartInitiateSchema);
export const videoMultipartPartValidator = validator(videoMultipartPartSchema);
export const videoMultipartCompleteValidator = validator(videoMultipartCompleteSchema);
export const videoMultipartAbortValidator = validator(videoMultipartAbortSchema);

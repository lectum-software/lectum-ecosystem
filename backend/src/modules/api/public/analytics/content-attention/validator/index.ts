import { z } from "zod";
import { type IValidatorRequest, validator } from "@/utils/validator";

const trackingIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9._:-]+$/);

const targetIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(120)
  .regex(/^[a-zA-Z0-9_-]+$/);

const targetTypeSchema = z.enum(["post", "reply"]);
const pathSchema = z.string().trim().min(1).max(2048);

export const contentAttentionSchema: IValidatorRequest = {
  body: [
    {
      key: "visitor_id",
      method: "string",
      coerse: "string",
      custom: trackingIdSchema,
    },
    {
      key: "session_id",
      method: "string",
      coerse: "string",
      custom: trackingIdSchema,
    },
    {
      key: "target_type",
      method: "string",
      coerse: "string",
      custom: targetTypeSchema,
    },
    {
      key: "target_id",
      method: "string",
      coerse: "string",
      custom: targetIdSchema,
    },
    {
      key: "attention_seconds",
      method: "numeric",
      coerse: "number",
      int: true,
      min: 0,
      max: 86400,
    },
    {
      key: "path",
      method: "string",
      coerse: "string",
      optional: true,
      nullable: true,
      custom: pathSchema,
    },
  ],
  params: [],
  query: [],
};

export default validator(contentAttentionSchema);

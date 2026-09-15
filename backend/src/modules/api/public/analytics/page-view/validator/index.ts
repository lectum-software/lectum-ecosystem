import { z } from "zod";
import { type IValidatorRequest, validator } from "@/utils/validator";

const trackingIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9._:-]+$/);

const pageViewIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);
const safeStringSchema = z.string().trim().min(1).max(2048);
const pathSchema = z.string().trim().min(1).max(2048);
const shortStringSchema = z.string().trim().min(1).max(180);
const utmSchema = z.string().trim().min(1).max(128);
const displayModeSchema = z.enum(["browser", "standalone", "fullscreen", "minimal-ui", "unknown"]);
const occurredAtSchema = z.string().trim().datetime({ offset: true });

export const createSchema: IValidatorRequest = {
  params: [],
  query: [],
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
      key: "path",
      method: "string",
      coerse: "string",
      custom: pathSchema,
    },
    {
      key: "title",
      method: "string",
      coerse: "string",
      optional: true,
      custom: shortStringSchema,
    },
    {
      key: "referrer",
      method: "string",
      coerse: "string",
      optional: true,
      custom: safeStringSchema,
    },
    {
      key: "utm_source",
      method: "string",
      coerse: "string",
      optional: true,
      custom: utmSchema,
    },
    {
      key: "utm_medium",
      method: "string",
      coerse: "string",
      optional: true,
      custom: utmSchema,
    },
    {
      key: "utm_campaign",
      method: "string",
      coerse: "string",
      optional: true,
      custom: utmSchema,
    },
    {
      key: "utm_content",
      method: "string",
      coerse: "string",
      optional: true,
      custom: utmSchema,
    },
    {
      key: "utm_term",
      method: "string",
      coerse: "string",
      optional: true,
      custom: utmSchema,
    },
    {
      key: "display_mode",
      method: "string",
      coerse: "string",
      optional: true,
      custom: displayModeSchema,
    },
    {
      key: "occurred_at",
      method: "string",
      coerse: "string",
      optional: true,
      custom: occurredAtSchema,
    },
  ],
};

export const durationSchema: IValidatorRequest = {
  params: [
    {
      key: "id",
      method: "string",
      coerse: "string",
      custom: pageViewIdSchema,
    },
  ],
  query: [],
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
      key: "duration_seconds",
      method: "numeric",
      coerse: "number",
      int: true,
      min: 0,
      max: 86400,
    },
    {
      key: "occurred_at",
      method: "string",
      coerse: "string",
      optional: true,
      custom: occurredAtSchema,
    },
  ],
};

export const createValidator = validator(createSchema);
export const durationValidator = validator(durationSchema);

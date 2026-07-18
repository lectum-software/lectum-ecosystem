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
const safeUrlSchema = z.string().trim().min(1).max(2048);
const retentionBucketsSchema = z.array(z.number().int().min(5).max(100)).max(20);

export const contentVideoWatchSchema: IValidatorRequest = {
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
      key: "video_url",
      method: "string",
      coerse: "string",
      optional: true,
      nullable: true,
      custom: safeUrlSchema,
    },
    {
      key: "duration_seconds",
      method: "numeric",
      coerse: "number",
      int: true,
      min: 0,
      max: 86400,
      optional: true,
      nullable: true,
    },
    {
      key: "watched_seconds",
      method: "numeric",
      coerse: "number",
      int: true,
      min: 0,
      max: 86400,
      optional: true,
      nullable: true,
    },
    {
      key: "max_position_seconds",
      method: "numeric",
      coerse: "number",
      int: true,
      min: 0,
      max: 86400,
      optional: true,
      nullable: true,
    },
    {
      key: "replay_count",
      method: "numeric",
      coerse: "number",
      int: true,
      min: 0,
      max: 100,
      optional: true,
      nullable: true,
    },
    {
      key: "completed",
      method: "boolean",
      coerse: "boolean",
      optional: true,
    },
    {
      key: "retention_buckets",
      method: "string_array",
      optional: true,
      nullable: true,
      custom: retentionBucketsSchema,
    },
  ],
  params: [],
  query: [],
};

export default validator(contentVideoWatchSchema);

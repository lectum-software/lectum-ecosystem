import { z } from "zod";
import { type IValidatorRequest, validator } from "@/utils/validator";

const trackingIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9._:-]+$/);
const actionTypeSchema = z.enum([
  "psychologist_video_favorite",
  "psychologist_video_profile_access",
  "psychologist_video_share",
  "psychologist_video_whatsapp_click",
  "pwa_install_prompt_accepted",
  "pwa_installed",
  "whatsapp_click",
]);
const displayModeSchema = z.enum(["browser", "standalone", "fullscreen", "minimal-ui", "unknown"]);
const occurredAtSchema = z.string().trim().datetime({ offset: true });
const pathSchema = z.string().trim().min(1).max(2048);
const targetLabelSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_:-]+$/);
const targetIdSchema = z.string().trim().min(1).max(128);

export const schema: IValidatorRequest = {
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
      key: "action_type",
      method: "string",
      coerse: "string",
      custom: actionTypeSchema,
    },
    {
      key: "path",
      method: "string",
      coerse: "string",
      optional: true,
      custom: pathSchema,
    },
    {
      key: "page_kind",
      method: "string",
      coerse: "string",
      optional: true,
      custom: targetLabelSchema,
    },
    {
      key: "target_id",
      method: "string",
      coerse: "string",
      optional: true,
      custom: targetIdSchema,
    },
    {
      key: "target_type",
      method: "string",
      coerse: "string",
      optional: true,
      custom: targetLabelSchema,
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

export default validator(schema);

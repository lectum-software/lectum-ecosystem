import { z } from "zod";
import { type IValidatorRequest, validator } from "@/utils/validator";

const trackingIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9._:-]+$/);
const actionTypeSchema = z.enum(["pwa_install_prompt_accepted", "pwa_installed"]);
const displayModeSchema = z.enum(["browser", "standalone", "fullscreen", "minimal-ui", "unknown"]);
const occurredAtSchema = z.string().trim().datetime({ offset: true });
const pathSchema = z.string().trim().min(1).max(2048);

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

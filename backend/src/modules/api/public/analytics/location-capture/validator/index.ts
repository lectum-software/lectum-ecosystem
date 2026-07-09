import { z } from "zod";
import { type IValidatorRequest, validator } from "@/utils/validator";

const visitorIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9._:-]+$/);

const deviceTypeSchema = z.enum(["mobile", "tablet", "desktop", "unknown"]);
const osSchema = z.enum(["android", "chromeos", "ios", "linux", "macos", "unknown", "windows"]);
const browserSchema = z.enum([
  "chrome",
  "edge",
  "firefox",
  "opera",
  "safari",
  "samsung",
  "unknown",
]);

export const schema: IValidatorRequest = {
  params: [],
  query: [],
  body: [
    {
      key: "visitor_id",
      method: "string",
      coerse: "string",
      custom: visitorIdSchema,
    },
    {
      key: "session_id",
      method: "string",
      coerse: "string",
      optional: true,
      custom: visitorIdSchema,
    },
    {
      key: "device_type",
      method: "string",
      coerse: "string",
      optional: true,
      custom: deviceTypeSchema,
    },
    {
      key: "os",
      method: "string",
      coerse: "string",
      optional: true,
      custom: osSchema,
    },
    {
      key: "browser",
      method: "string",
      coerse: "string",
      optional: true,
      custom: browserSchema,
    },
    {
      key: "viewport_width",
      method: "numeric",
      int: true,
      positive: true,
      max: 10000,
      optional: true,
    },
    {
      key: "viewport_height",
      method: "numeric",
      int: true,
      positive: true,
      max: 10000,
      optional: true,
    },
  ],
};

export default validator(schema);

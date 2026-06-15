import { z } from "zod";
import { type IValidatorRequest, validator } from "@/utils/validator";

const visitorIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9._:-]+$/);

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
  ],
};

export default validator(schema);

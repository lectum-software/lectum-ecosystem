import { validator } from "@/utils/validator";
import { repliesSchema } from "./index";

export const contentVideosValidator = validator({
  ...repliesSchema,
  query: [
    ...(repliesSchema.query ?? []),
    { key: "cursor", coerse: "string", method: "string", min: 34, max: 64, optional: true },
  ],
});

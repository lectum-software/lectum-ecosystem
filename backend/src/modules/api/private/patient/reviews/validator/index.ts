import { z } from "zod";
import { type IValidatorRequest, validator } from "@/utils/validator";

export const testimonialPayload = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(1000),
});

export const indexSchema: IValidatorRequest = {
  query: [
    {
      key: "limit",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      max: 50,
      optional: true,
    },
    { key: "page", coerse: "number", method: "numeric", int: true, positive: true, optional: true },
  ],
};

export const eligibilitySchema: IValidatorRequest = {
  params: [{ key: "id", coerse: "string", method: "string" }],
};

export const storeSchema: IValidatorRequest = {
  body: [
    { key: "psychologist_id", coerse: "string", method: "string" },
    {
      key: "rating",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      min: 1,
      max: 5,
    },
    {
      key: "comment",
      coerse: "string",
      method: "string",
      max: 1000,
    },
  ],
};

export const indexValidator = validator(indexSchema);
export const eligibilityValidator = validator(eligibilitySchema);
export const deleteValidator = validator(eligibilitySchema);
export const storeValidator = validator(storeSchema);
export const updateValidator = validator({
  params: eligibilitySchema.params,
  body: storeSchema.body?.filter((field) => field.key !== "psychologist_id"),
});

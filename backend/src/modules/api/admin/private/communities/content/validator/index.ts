import { type IValidatorRequest, validator } from "@/utils/validator";

export const listSchema: IValidatorRequest = {
  query: [
    {
      key: "page",
      method: "numeric",
      coerse: "number",
      int: true,
      min: 1,
      max: 100000,
      optional: true,
    },
    {
      key: "limit",
      method: "numeric",
      coerse: "number",
      int: true,
      min: 1,
      max: 50,
      optional: true,
    },
    ...["q", "psychologist", "community"].map((key) => ({
      key,
      method: "string" as const,
      coerse: "string" as const,
      max: 120,
      optional: true,
    })),
    ...["from", "to"].map((key) => ({
      key,
      method: "string" as const,
      coerse: "string" as const,
      max: 10,
      optional: true,
    })),
    { key: "type", method: "enumeric", values: ["all", "posts", "replies"], optional: true },
    { key: "sort", method: "enumeric", values: ["recent", "oldest"], optional: true },
    { key: "status", method: "enumeric", values: ["published", "removed"], optional: true },
    {
      key: "period",
      method: "enumeric",
      values: ["all", "custom", "today", "7d", "30d", "90d", "week", "month", "year"],
      optional: true,
    },
  ],
};

export const listValidator = validator(listSchema);

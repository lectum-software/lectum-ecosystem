import { z } from "zod";
import { type IValidatorRequest, validator } from "@/utils/validator";
export const idParam = [
  { key: "id", method: "string", min: 1, max: 160 },
] satisfies IValidatorRequest["params"];
const page = [
  {
    key: "page",
    method: "numeric",
    coerse: "number",
    int: true,
    min: 1,
    max: 100000,
    optional: true,
  },
] satisfies IValidatorRequest["query"];
const revision = {
  key: "revision",
  method: "numeric",
  int: true,
  min: 1,
  max: 2147483647,
} as const;
const fields = [
  { key: "title", method: "string", min: 5, max: 180 },
  { key: "body", method: "string", min: 1, max: 100000 },
  { key: "change_summary", method: "string", min: 10, max: 2000 },
] satisfies IValidatorRequest["body"];
export const listValidator = validator({ query: page });
export const detailValidator = validator({ params: idParam });
export const acceptancesValidator = validator({ params: idParam, query: page });
export const createValidator = validator({
  body: [...fields, { key: "kind", method: "enumeric", values: ["terms", "privacy"] }],
});
export const editValidator = validator({ params: idParam, body: [...fields, revision] });
export const publishValidator = validator({
  params: idParam,
  body: [revision, { key: "review_confirmed", custom: z.boolean() }],
});

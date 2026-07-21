import { type IValidatorRequest, validator } from "@/utils/validator";

const patientParam = {
  key: "id",
  coerse: "string",
  method: "string",
  min: 1,
  max: 120,
} satisfies NonNullable<IValidatorRequest["params"]>[number];

export const reportsSchema: IValidatorRequest = {
  params: [patientParam],
  query: [
    { key: "from", coerse: "string", method: "string", max: 10, optional: true },
    {
      key: "limit",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      max: 50,
      optional: true,
    },
    {
      key: "page",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      max: 9999,
      optional: true,
    },
    { key: "status", coerse: "string", method: "string", max: 40, optional: true },
    { key: "to", coerse: "string", method: "string", max: 10, optional: true },
    { key: "type", coerse: "string", method: "string", max: 20, optional: true },
  ],
};

export const reportsValidator = validator(reportsSchema);

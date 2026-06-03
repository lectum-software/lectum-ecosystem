import { type IValidatorRequest, validator } from "@/utils/validator";

export const schema: IValidatorRequest = {
  params: [
    //*
  ],

  query: [
    //*
    {
      key: "limit",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      optional: true,
    },
    {
      key: "page",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      optional: true,
    },
    {
      key: "search",
      coerse: "string",
      method: "string",
      optional: true,
      format: "lower",
    },
    {
      key: "orderKey",
      coerse: "string",
      method: "string",
      optional: true,
    },
    {
      key: "orderValue",
      coerse: "string",
      method: "enumeric",
      values: ["asc", "desc"],
      optional: true,
    },
    {
      key: "startDate",
      coerse: "Date",
      method: "date",
      optional: true,
    },
    {
      key: "endDate",
      coerse: "Date",
      method: "date",
      optional: true,
    },
  ],

  body: [
    //*
  ],
};

export default validator(schema);

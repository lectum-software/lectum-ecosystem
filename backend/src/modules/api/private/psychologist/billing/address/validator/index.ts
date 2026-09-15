import { type IValidatorRequest, validator } from "@/utils/validator";

export const requestSchema: IValidatorRequest = {
  body: [
    {
      key: "zip",
      coerse: "string",
      method: "string",
      min: 8,
      max: 8,
    },
    {
      key: "street",
      coerse: "string",
      method: "string",
      min: 2,
      max: 160,
    },
    {
      key: "number",
      coerse: "string",
      method: "string",
      min: 1,
      max: 30,
    },
    {
      key: "complement",
      coerse: "string",
      method: "string",
      optional: true,
      nullable: true,
      max: 120,
    },
    {
      key: "district",
      coerse: "string",
      method: "string",
      min: 2,
      max: 100,
    },
    {
      key: "city",
      coerse: "string",
      method: "string",
      min: 2,
      max: 100,
    },
    {
      key: "state",
      coerse: "string",
      method: "string",
      min: 2,
      max: 2,
    },
  ],
};

export const requestValidator = validator(requestSchema);

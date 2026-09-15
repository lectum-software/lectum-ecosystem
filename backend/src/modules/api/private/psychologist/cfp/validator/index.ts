import { type IValidatorRequest, validator } from "@/utils/validator";

export const searchSchema: IValidatorRequest = {
  body: [
    {
      key: "cpf",
      coerse: "string",
      method: "string",
      min: 11,
      max: 14,
      optional: true,
    },
    {
      key: "nome",
      coerse: "string",
      method: "string",
      min: 2,
      max: 120,
      optional: true,
    },
    {
      key: "registro",
      coerse: "string",
      method: "string",
      min: 2,
      max: 30,
      optional: true,
    },
    {
      key: "uf",
      coerse: "string",
      method: "string",
      min: 2,
      max: 2,
      format: "upper",
      optional: true,
    },
  ],
};

export const confirmSchema: IValidatorRequest = {
  body: [
    {
      key: "check_id",
      coerse: "string",
      method: "string",
      min: 8,
      max: 80,
    },
    {
      key: "result_key",
      coerse: "string",
      method: "string",
      min: 1,
      max: 240,
    },
  ],
};

export const searchValidator = validator(searchSchema);
export const confirmValidator = validator(confirmSchema);

import { type IValidatorRequest, validator } from "@/utils/validator";

const psychologistParam = {
  key: "id",
  coerse: "string",
  method: "string",
  min: 1,
  max: 120,
} satisfies NonNullable<IValidatorRequest["params"]>[number];

export const showSchema: IValidatorRequest = {
  params: [psychologistParam],
};

export const grantSchema: IValidatorRequest = {
  params: [psychologistParam],
  body: [
    {
      key: "period_days",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      max: 365,
    },
    {
      key: "notes",
      coerse: "string",
      method: "string",
      max: 500,
      nullable: true,
      optional: true,
    },
    {
      key: "crp_registration_date",
      coerse: "string",
      method: "string",
      max: 10,
      nullable: true,
      optional: true,
    },
    {
      key: "cpf",
      coerse: "string",
      method: "string",
      max: 14,
      nullable: true,
      optional: true,
    },
    {
      key: "regional_crp",
      coerse: "string",
      method: "string",
      max: 120,
      nullable: true,
      optional: true,
    },
    {
      key: "crp",
      coerse: "string",
      method: "string",
      max: 40,
      nullable: true,
      optional: true,
    },
  ],
};

export const showValidator = validator(showSchema);
export const grantValidator = validator(grantSchema);

export default showValidator;

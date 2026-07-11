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

export const approveSchema: IValidatorRequest = {
  params: [psychologistParam],
  body: [
    { key: "regional_crp", coerse: "string", method: "string", min: 1, max: 120 },
    { key: "crp", coerse: "string", method: "string", min: 1, max: 40 },
    { key: "cpf", coerse: "string", method: "string", min: 11, max: 14 },
    { key: "crp_registration_date", coerse: "string", method: "string", min: 10, max: 10 },
    { key: "situation_confirmed", coerse: "boolean", method: "boolean" },
    {
      key: "notes",
      coerse: "string",
      method: "string",
      min: 10,
      max: 1000,
      nullable: true,
      optional: true,
    },
    { key: "confirmation", coerse: "string", method: "string", min: 10, max: 20 },
  ],
};

export const rejectSchema: IValidatorRequest = {
  params: [psychologistParam],
  body: [
    { key: "reason", coerse: "string", method: "string", min: 10, max: 1000 },
    { key: "confirmation", coerse: "string", method: "string", min: 10, max: 20 },
  ],
};

export const updateIdentitySchema: IValidatorRequest = {
  params: [psychologistParam],
  body: [
    { key: "regional_crp", coerse: "string", method: "string", min: 1, max: 120 },
    { key: "crp", coerse: "string", method: "string", min: 1, max: 40 },
    { key: "crp_registration_date", coerse: "string", method: "string", min: 10, max: 10 },
  ],
};

export const showValidator = validator(showSchema);
export const approveValidator = validator(approveSchema);
export const rejectValidator = validator(rejectSchema);
export const updateIdentityValidator = validator(updateIdentitySchema);

export default showValidator;

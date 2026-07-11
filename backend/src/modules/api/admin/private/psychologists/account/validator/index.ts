import { type IValidatorRequest, validator } from "@/utils/validator";

const psychologistParam = {
  key: "id",
  coerse: "string",
  method: "string",
  min: 1,
  max: 120,
} satisfies NonNullable<IValidatorRequest["params"]>[number];

const reasonField = {
  key: "reason",
  coerse: "string",
  method: "string",
  min: 10,
  max: 500,
} satisfies NonNullable<IValidatorRequest["body"]>[number];

const confirmationField = (key = "confirmation") =>
  ({
    key,
    coerse: "string",
    method: "string",
    min: 3,
    max: 40,
  }) satisfies NonNullable<IValidatorRequest["body"]>[number];

export const showAccountSchema: IValidatorRequest = {
  params: [psychologistParam],
};

export const changeEmailSchema: IValidatorRequest = {
  params: [psychologistParam],
  body: [{ key: "email", coerse: "string", method: "email" }, reasonField, confirmationField()],
};

export const reasonOnlySchema: IValidatorRequest = {
  params: [psychologistParam],
  body: [reasonField],
};

export const setTemporaryPasswordSchema: IValidatorRequest = {
  params: [psychologistParam],
  body: [
    { key: "password", coerse: "string", method: "password" },
    { key: "password_confirm", coerse: "string", method: "password" },
    reasonField,
    confirmationField(),
  ],
  relations: {
    body: [
      {
        keys: ["password", "password_confirm"],
        type: "equal",
      },
    ],
  },
};

export const revokeSessionsSchema: IValidatorRequest = {
  params: [psychologistParam],
  body: [reasonField, confirmationField()],
};

export const showAccountValidator = validator(showAccountSchema);
export const changeEmailValidator = validator(changeEmailSchema);
export const reasonOnlyValidator = validator(reasonOnlySchema);
export const setTemporaryPasswordValidator = validator(setTemporaryPasswordSchema);
export const revokeSessionsValidator = validator(revokeSessionsSchema);

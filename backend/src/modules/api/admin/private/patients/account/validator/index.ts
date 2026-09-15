import { type IValidatorRequest, validator } from "@/utils/validator";

const patientParam = {
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

const suspensionDurationField = {
  key: "suspension_duration_days",
  coerse: "number",
  method: "numeric",
  int: true,
  min: 1,
  max: 90,
} satisfies NonNullable<IValidatorRequest["body"]>[number];

export const showAccountSchema: IValidatorRequest = {
  params: [patientParam],
};

export const changeEmailSchema: IValidatorRequest = {
  params: [patientParam],
  body: [{ key: "email", coerse: "string", method: "email" }, reasonField, confirmationField()],
};

export const reasonOnlySchema: IValidatorRequest = {
  params: [patientParam],
  body: [reasonField],
};

export const setTemporaryPasswordSchema: IValidatorRequest = {
  params: [patientParam],
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
  params: [patientParam],
  body: [reasonField, confirmationField()],
};

export const suspendAccountSchema: IValidatorRequest = {
  params: [patientParam],
  body: [reasonField, confirmationField(), suspensionDurationField],
};

export const showAccountValidator = validator(showAccountSchema);
export const changeEmailValidator = validator(changeEmailSchema);
export const reasonOnlyValidator = validator(reasonOnlySchema);
export const setTemporaryPasswordValidator = validator(setTemporaryPasswordSchema);
export const revokeSessionsValidator = validator(revokeSessionsSchema);
export const suspendAccountValidator = validator(suspendAccountSchema);

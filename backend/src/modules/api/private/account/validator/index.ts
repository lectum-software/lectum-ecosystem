import { type IValidatorRequest, validator } from "@/utils/validator";

export const emailSchema: IValidatorRequest = {
  body: [
    {
      key: "current_password",
      coerse: "string",
      method: "string",
      min: 1,
      max: 128,
    },
    {
      key: "email",
      coerse: "string",
      method: "email",
    },
  ],
};

export const passwordSchema: IValidatorRequest = {
  body: [
    {
      key: "current_password",
      coerse: "string",
      method: "string",
      min: 1,
      max: 128,
    },
    {
      key: "password",
      coerse: "string",
      method: "password",
    },
    {
      key: "password_confirm",
      coerse: "string",
      method: "password",
    },
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

export const emailValidator = validator(emailSchema);
export const passwordValidator = validator(passwordSchema);

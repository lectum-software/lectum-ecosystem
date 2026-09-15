import { type IValidatorRequest, validator } from "@/utils/validator";

export const requestSchema: IValidatorRequest = {
  body: [
    {
      key: "phone",
      coerse: "string",
      method: "phone",
    },
  ],
};

export const confirmSchema: IValidatorRequest = {
  body: [
    {
      key: "verification_id",
      coerse: "string",
      method: "string",
    },
    {
      key: "code",
      coerse: "string",
      method: "string",
      min: 6,
      max: 6,
    },
  ],
};

export const requestValidator = validator(requestSchema);
export const confirmValidator = validator(confirmSchema);

import { type IValidatorRequest, validator } from "@/utils/validator";

export const schema: IValidatorRequest = {
  body: [
    {
      key: "email",
      coerse: "string",
      method: "email",
    },
    {
      key: "password",
      coerse: "string",
      method: "string",
    },
  ],
};

export default validator(schema);

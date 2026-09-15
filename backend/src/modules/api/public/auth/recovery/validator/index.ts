import { type IValidatorRequest, validator } from "@/utils/validator";

export const schema: IValidatorRequest = {
  body: [
    {
      key: "email",
      coerse: "string",
      method: "email",
    },
  ],
};

export default validator(schema);

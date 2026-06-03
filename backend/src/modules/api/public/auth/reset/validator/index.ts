import { type IValidatorRequest, validator } from "@/utils/validator";

export const schema: IValidatorRequest = {
  params: [
    {
      key: "code",
      coerse: "string",
      method: "string",
    },
  ],
  body: [
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

export default validator(schema);

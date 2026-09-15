import { type IValidatorRequest, validator } from "@/utils/validator";

export const schema: IValidatorRequest = {
  params: [
    //*
    {
      key: "id",
      coerse: "string",
      method: "string",
    },
  ],

  query: [
    //*
  ],

  body: [
    //*
    {
      key: "read",
      method: "boolean",
      coerse: "boolean",
    },
  ],
};

export default validator(schema);

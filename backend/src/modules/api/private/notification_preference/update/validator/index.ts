import { type IValidatorRequest, validator } from "@/utils/validator";

export const schema: IValidatorRequest = {
  params: [
    //*
  ],

  query: [
    //*
  ],

  body: [
    //*
    {
      key: "prefs",
      method: "prisma",
    },
  ],
};

export default validator(schema);

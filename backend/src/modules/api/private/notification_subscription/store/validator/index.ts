//#ignore
import { z } from "zod";
import { type IValidatorRequest, validator } from "@/utils/validator";
//@ignore

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
      key: "subscription",
      method: "string",
      coerse: "string",
      //#ignore
      custom: z.any(),
      //@ignore
    },
    //#ignore
    {
      key: "force",
      method: "boolean",
      coerse: "boolean",
      optional: true,
    },
    //@ignore
  ],
};

export default validator(schema);

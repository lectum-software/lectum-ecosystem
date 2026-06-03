//
import { z } from "zod";
import { type IValidatorRequest, validator } from "@/utils/validator";

export const schema: IValidatorRequest = {
  params: [
    //*
  ],

  query: [
    //*
    {
      key: "select",
      method: "prisma",
      optional: true,
      //
      custom: z.null().optional(),
    },
    {
      key: "include",
      method: "prisma",
      optional: true,
      //
      custom: z.null().optional(),
    },
  ],

  body: [
    //*
    {
      key: "name",
      method: "string",
      coerse: "string",
    },
    {
      key: "email",
      method: "email",
      coerse: "string",
    },
    {
      key: "active",
      method: "boolean",
      coerse: "boolean",
      optional: true,
    },
    {
      key: "password",
      method: "password",
      coerse: "string",
    },
    {
      key: "password_confirm",
      method: "password",
      coerse: "string",
    },
  ],
  relations: {
    query: [],
    params: [],
    body: [
      {
        type: "equal",
        keys: ["password", "password_confirm"],
      },
    ],
  },
};

export default validator(schema);

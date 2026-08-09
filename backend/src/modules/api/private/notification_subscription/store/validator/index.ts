import { webPushSubscriptionSchema } from "@/utils/push-subscription";
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
      key: "subscription",
      method: "string",
      coerse: "string",
      //#ignore
      custom: webPushSubscriptionSchema,
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

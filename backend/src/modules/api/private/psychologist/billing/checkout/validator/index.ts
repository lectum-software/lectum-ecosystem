import { type IValidatorRequest, validator } from "@/utils/validator";

export const requestSchema: IValidatorRequest = {
  body: [
    {
      key: "card_token",
      coerse: "string",
      method: "string",
      min: 8,
      max: 2048,
    },
    {
      key: "payment_type_id",
      coerse: "string",
      method: "enumeric",
      values: ["credit_card", "debit_card", "prepaid_card"],
    },
    {
      key: "return_url",
      coerse: "string",
      method: "string",
      optional: true,
      nullable: true,
      max: 512,
    },
  ],
};

export const requestValidator = validator(requestSchema);

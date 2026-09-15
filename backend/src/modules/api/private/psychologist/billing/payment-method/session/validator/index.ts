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
      key: "brand",
      coerse: "string",
      method: "string",
      optional: true,
      nullable: true,
      max: 64,
    },
    {
      key: "last4",
      coerse: "string",
      method: "string",
      optional: true,
      nullable: true,
      min: 4,
      max: 4,
    },
    {
      key: "exp_month",
      coerse: "number",
      method: "numeric",
      optional: true,
      nullable: true,
      min: 1,
      max: 12,
    },
    {
      key: "exp_year",
      coerse: "number",
      method: "numeric",
      optional: true,
      nullable: true,
      min: 2026,
      max: 2100,
    },
  ],
};

export const requestValidator = validator(requestSchema);

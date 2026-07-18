import { type IValidatorRequest, validator } from "@/utils/validator";

const patientParam = {
  key: "id",
  coerse: "string",
  method: "string",
  min: 1,
  max: 120,
} satisfies NonNullable<IValidatorRequest["params"]>[number];

export const showSchema: IValidatorRequest = {
  params: [patientParam],
  query: [
    { key: "from", coerse: "string", method: "string", max: 10, optional: true },
    { key: "period", coerse: "string", method: "string", max: 10, optional: true },
    { key: "to", coerse: "string", method: "string", max: 10, optional: true },
  ],
};

export const showValidator = validator(showSchema);

export default showValidator;

import { type IValidatorRequest, validator } from "@/utils/validator";

const patientParam = {
  key: "id",
  coerse: "string",
  method: "string",
  min: 1,
  max: 120,
} satisfies NonNullable<IValidatorRequest["params"]>[number];

export const updatePersonalDataSchema: IValidatorRequest = {
  params: [patientParam],
  body: [
    {
      key: "gender",
      coerse: "string",
      method: "string",
      max: 80,
      nullable: true,
      optional: true,
    },
    { key: "reason", coerse: "string", method: "string", min: 10, max: 500 },
  ],
};

export const updatePersonalDataValidator = validator(updatePersonalDataSchema);

export default updatePersonalDataValidator;

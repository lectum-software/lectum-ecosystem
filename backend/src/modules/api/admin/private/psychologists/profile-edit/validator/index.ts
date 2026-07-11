import { type IValidatorRequest, validator } from "@/utils/validator";

const psychologistParam = {
  key: "id",
  coerse: "string",
  method: "string",
  min: 1,
  max: 120,
} satisfies NonNullable<IValidatorRequest["params"]>[number];

const optionalNullableString = (key: string, max: number) =>
  ({
    key,
    coerse: "string",
    method: "string",
    min: 0,
    max,
    optional: true,
    nullable: true,
  }) satisfies NonNullable<IValidatorRequest["body"]>[number];

export const updatePersonalDataSchema: IValidatorRequest = {
  params: [psychologistParam],
  body: [
    optionalNullableString("cpf", 14),
    optionalNullableString("whatsapp", 24),
    optionalNullableString("birthdate", 10),
    optionalNullableString("gender", 80),
    optionalNullableString("race_color", 80),
    optionalNullableString("religion", 80),
    optionalNullableString("address_street", 160),
    optionalNullableString("address_number", 40),
    optionalNullableString("address_complement", 120),
    optionalNullableString("address_district", 120),
    optionalNullableString("address_zip", 12),
    optionalNullableString("address_city", 120),
    optionalNullableString("address_state", 2),
    { key: "confirm_cpf_change", coerse: "boolean", method: "boolean", optional: true },
    { key: "reason", coerse: "string", method: "string", min: 10, max: 500 },
  ],
};

export const updateProfessionalDataSchema: IValidatorRequest = {
  params: [psychologistParam],
  body: [
    { key: "specialty_ids", coerse: "string_array", method: "string_array", optional: true },
    { key: "service_ids", coerse: "string_array", method: "string_array", optional: true },
    { key: "approach_ids", coerse: "string_array", method: "string_array", optional: true },
    { key: "languages", coerse: "string_array", method: "string_array", optional: true },
    { key: "target_audience", coerse: "string_array", method: "string_array", optional: true },
    optionalNullableString("modality", 20),
    { key: "reason", coerse: "string", method: "string", min: 10, max: 500 },
  ],
};

export const updatePersonalDataValidator = validator(updatePersonalDataSchema);
export const updateProfessionalDataValidator = validator(updateProfessionalDataSchema);

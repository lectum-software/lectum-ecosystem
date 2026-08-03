import { type IValidatorRequest, validator } from "@/utils/validator";

const psychologistParams = [
  {
    key: "id",
    coerse: "string",
    method: "string",
    min: 1,
    max: 120,
  },
] satisfies IValidatorRequest["params"];

export const showValidator = validator({ params: psychologistParams });

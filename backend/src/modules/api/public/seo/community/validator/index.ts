import { type IValidatorRequest, validator } from "@/utils/validator";

const communityParams = [
  {
    key: "slug",
    coerse: "string",
    method: "string",
    min: 1,
    max: 120,
    format: "lower",
  },
] satisfies IValidatorRequest["params"];

export const showValidator = validator({ params: communityParams });

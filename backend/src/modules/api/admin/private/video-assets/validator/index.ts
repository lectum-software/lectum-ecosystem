import { type IValidatorRequest, validator } from "@/utils/validator";

export const playbackValidator = validator({
  params: [
    {
      key: "id",
      coerse: "string",
      method: "string",
      min: 8,
      max: 64,
    },
  ],
} satisfies IValidatorRequest);

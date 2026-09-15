import { z } from "zod";
import { type IValidatorRequest, validator } from "@/utils/validator";

export const confirmationCodeSchema = z
  .string()
  .length(6, "Informe os 6 números do código.")
  .regex(/^[0-9]{6}$/, "Informe os 6 números do código.");

export const schema: IValidatorRequest = {
  params: [
    {
      key: "code",
      custom: confirmationCodeSchema,
    },
  ],
};

export default validator(schema);

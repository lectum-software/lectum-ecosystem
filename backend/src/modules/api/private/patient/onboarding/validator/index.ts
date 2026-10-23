import { adultBirthdateDateSchema } from "@/utils/adult-birthdate";
import { type IValidatorRequest, validator } from "@/utils/validator";

export const schema: IValidatorRequest = {
  body: [
    {
      key: "name",
      method: "string",
      min: 2,
      max: 120,
      optional: true,
    },
    {
      key: "gender",
      method: "enumeric",
      values: ["feminino", "masculino", "nao_binario", "prefiro_nao_dizer"],
      optional: true,
    },
    {
      key: "goal",
      method: "enumeric",
      values: ["encontrar_psicologo", "conhecer_comunidade"],
      optional: true,
    },
    {
      key: "birthdate",
      custom: adultBirthdateDateSchema.optional(),
    },
    {
      key: "phone",
      method: "phone",
      optional: true,
    },
  ],
};

export default validator(schema);

import { type IValidatorRequest, validator } from "@/utils/validator";

export const schema: IValidatorRequest = {
  body: [
    {
      key: "goal",
      method: "enumeric",
      values: ["encontrar_psicologo", "conhecer_comunidade"],
      optional: true,
    },
    {
      key: "birthdate",
      method: "date",
      max_today: true,
      optional: true,
    },
    {
      key: "phone",
      method: "phone",
      optional: true,
    },
  ],
};

export default validator(schema);

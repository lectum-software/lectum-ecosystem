import { type IValidatorRequest, validator } from "@/utils/validator";

export const schema: IValidatorRequest = {
  body: [
    {
      key: "name",
      method: "string",
      min: 2,
      max: 120,
    },
    {
      key: "gender",
      method: "enumeric",
      values: ["feminino", "masculino", "nao_binario", "prefiro_nao_dizer"],
      nullable: true,
      optional: true,
    },
    {
      key: "goal",
      method: "enumeric",
      values: ["encontrar_psicologo", "conhecer_comunidade"],
      nullable: true,
      optional: true,
    },
    {
      key: "birthdate",
      method: "date",
      max_today: true,
      nullable: true,
      optional: true,
    },
    {
      key: "phone",
      method: "string",
      max: 32,
      nullable: true,
      optional: true,
    },
    {
      key: "bio",
      method: "string",
      max: 280,
      nullable: true,
      optional: true,
    },
  ],
};

export default validator(schema);

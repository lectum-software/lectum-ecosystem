import { type IValidatorRequest, validator } from "@/utils/validator";

const BRAZIL_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

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
    {
      key: "state",
      method: "enumeric",
      values: [...BRAZIL_STATES],
      nullable: true,
      optional: true,
    },
    {
      key: "city",
      method: "string",
      max: 120,
      nullable: true,
      optional: true,
    },
  ],
};

export default validator(schema);

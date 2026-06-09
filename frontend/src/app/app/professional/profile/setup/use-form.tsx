import { z } from "zod";
import type { FreeProfessionalProfile } from "@/api/generator/types/free-profile";
import { onlyDigits } from "@/components/controllers/utils";
import { type Field, useFormList } from "@/hooks/form";
import {
  COUNTRY_CALLING_CODE_OPTIONS,
  DEFAULT_COUNTRY_CALLING_CODE,
  findCountryCallingCode,
} from "@/utils/country-calling-codes";
import {
  CRP_REGION_OPTIONS,
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  RACE_COLOR_OPTIONS,
  RELIGION_OPTIONS,
  STATE_OPTIONS,
} from "./options";

export type AcademicFormationForm = {
  title: string;
  institution: string;
  graduation_year: string;
};

export type FreeProfileForm = {
  name: string;
  gender: string;
  race_color: string;
  religion: string;
  cpf: string;
  crp_region: string;
  crp_number: string;
  countryCode: string;
  whatsapp: string;
  headline: string;
  bio: string;
  modality: "online" | "presencial" | "hibrido" | "";
  language: string;
  published: boolean;
  discount_first_session: boolean;
  social_value: boolean;
  accepts_insurance: boolean;
  show_experience_tag: boolean;
  academic_formations: AcademicFormationForm[];
  address_street: string;
  address_number: string;
  address_complement: string;
  address_district: string;
  address_zip: string;
  address_city: string;
  address_state: string;
  specialty_ids: string[];
  service_ids: string[];
  approach_ids: string[];
  target_audience: string[];
  available_days: string[];
};

const getNationalDigits = (value?: string | null, countryCode = DEFAULT_COUNTRY_CALLING_CODE) => {
  const digits = onlyDigits(value);

  if (digits.startsWith(countryCode) && digits.length > countryCode.length) {
    return digits.slice(countryCode.length);
  }

  return digits;
};

const isPhoneLengthValid = (value: string, countryCode: string) => {
  const nationalDigits = getNationalDigits(value, countryCode);
  const totalLength = (countryCode + nationalDigits).length;

  return nationalDigits.length >= 6 && totalLength <= 15;
};

export const toWhatsappPhoneE164 = (value: string, countryCode = DEFAULT_COUNTRY_CALLING_CODE) => {
  const nationalDigits = getNationalDigits(value, countryCode);

  return nationalDigits ? `+${countryCode}${nationalDigits}` : null;
};

export const freeProfileSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome profissional").max(120),
    gender: z.string().trim().min(1, "Selecione seu gênero").max(40),
    race_color: z.string().trim().min(1, "Selecione sua raça/cor").max(40),
    religion: z.string().trim().min(1, "Selecione sua religião").max(80),
    cpf: z
      .string()
      .refine((value) => !value || onlyDigits(value).length === 11, "Informe um CPF válido"),
    crp_region: z
      .string()
      .trim()
      .min(1, "Selecione a Regional do CRP")
      .max(40, "Regional muito longa"),
    crp_number: z
      .string()
      .trim()
      .min(1, "Informe o Nº Registro CRP")
      .max(40, "Registro muito longo"),
    countryCode: z.string().min(1, "Selecione o país"),
    whatsapp: z.string(),
    headline: z
      .string()
      .trim()
      .min(3, "Informe uma bio curta")
      .max(120, "A bio curta deve ter no máximo 120 caracteres"),
    bio: z
      .string()
      .trim()
      .min(20, "Escreva uma apresentação com pelo menos 20 caracteres")
      .max(2000),
    modality: z.enum(["online", "presencial", "hibrido", ""], {
      message: "Selecione a modalidade",
    }),
    language: z.string().trim().min(2, "Selecione um idioma"),
    published: z.boolean(),
    discount_first_session: z.boolean(),
    social_value: z.boolean(),
    accepts_insurance: z.boolean(),
    show_experience_tag: z.boolean(),
    academic_formations: z
      .array(
        z.object({
          title: z.string().trim().max(160),
          institution: z.string().trim().max(160),
          graduation_year: z.string().trim().max(20),
        }),
      )
      .max(5, "Adicione no máximo 5 formações"),
    address_street: z.string().trim().max(160),
    address_number: z.string().trim().max(40),
    address_complement: z.string().trim().max(80),
    address_district: z.string().trim().max(120),
    address_zip: z.string().trim().max(20),
    address_city: z.string().trim().min(1, "Selecione a cidade").max(120),
    address_state: z.string().trim().min(2, "Selecione o estado").max(2),
    specialty_ids: z.array(z.string()),
    service_ids: z.array(z.string()),
    approach_ids: z.array(z.string()).min(1, "Selecione uma abordagem"),
    target_audience: z.array(z.string()),
    available_days: z.array(z.string()),
  })
  .refine((data) => isPhoneLengthValid(data.whatsapp, data.countryCode), {
    message: "Informe um WhatsApp válido",
    path: ["whatsapp"],
  });

export const fields = [
  {
    name: "name",
    field: "input",
    label: "Nome completo",
    placeholder: "Ex.: Roberto Silva",
    required: true,
    autoComplete: "name",
  },
  {
    name: "gender",
    field: "select",
    label: "Gênero",
    placeholder: "Selecione seu gênero",
    options: GENDER_OPTIONS,
    required: true,
  },
  {
    name: "race_color",
    field: "select",
    label: "Raça/Cor",
    placeholder: "Selecione sua raça/cor",
    options: RACE_COLOR_OPTIONS,
    required: true,
  },
  {
    name: "religion",
    field: "select",
    label: "Religião",
    placeholder: "Selecione sua religião",
    options: RELIGION_OPTIONS,
    required: true,
  },
  {
    name: "cpf",
    field: "cpf",
    label: "CPF",
    placeholder: "000.000.000-00",
    autoComplete: "off",
  },
  {
    name: "crp_region",
    field: "select",
    label: "Regional do CRP",
    placeholder: "Selecione a regional",
    options: CRP_REGION_OPTIONS,
    required: true,
  },
  {
    name: "crp_number",
    field: "input",
    label: "Nº Registro CRP",
    placeholder: "000000",
    required: true,
  },
  {
    name: "whatsapp",
    field: "phone",
    label: "WhatsApp profissional",
    placeholder: "(00) 00000-0000",
    countryCodeName: "countryCode",
    countryCodeOptions: COUNTRY_CALLING_CODE_OPTIONS,
    required: true,
    autoComplete: "tel",
  },
  {
    name: "headline",
    field: "input",
    label: "Bio",
    placeholder: "Ex.: Especialista em Relacionamentos",
    description: "Texto curto com até 120 caracteres.",
    max: 120,
    showCounter: true,
    required: true,
  },
  {
    name: "bio",
    field: "textarea",
    label: "Apresentação de texto",
    placeholder: "Conte sobre sua trajetória, experiência e como você ajuda seus pacientes.",
    required: true,
    rows: 6,
  },
  {
    name: "modality",
    field: "select",
    label: "Modalidades",
    required: true,
    options: [
      { label: "Online", value: "online" },
      { label: "Presencial", value: "presencial" },
      { label: "Presencial e Online", value: "hibrido" },
    ],
  },
  {
    name: "language",
    field: "select",
    label: "Idiomas",
    placeholder: "Selecione o idioma",
    required: true,
    options: LANGUAGE_OPTIONS,
  },
  {
    name: "address_street",
    field: "input",
    label: "Logradouro",
    placeholder: "Ex.: Rua das Flores",
  },
  {
    name: "address_number",
    field: "input",
    label: "Número",
    placeholder: "123",
  },
  {
    name: "address_complement",
    field: "input",
    label: "Complemento",
    placeholder: "Apto 42",
  },
  {
    name: "address_district",
    field: "input",
    label: "Bairro",
    placeholder: "Centro",
  },
  {
    name: "address_zip",
    field: "input",
    label: "CEP",
    placeholder: "00000-000",
  },
  {
    name: "address_city",
    field: "select",
    label: "Cidade",
    placeholder: "Selecione a cidade",
    options: [],
    required: true,
  },
  {
    name: "address_state",
    field: "select",
    label: "Estado",
    placeholder: "Selecione o estado",
    options: STATE_OPTIONS,
    required: true,
  },
] satisfies Field<FreeProfileForm>[];

const toWhatsappPhoneInput = (value?: string | null, countryCode = DEFAULT_COUNTRY_CALLING_CODE) =>
  getNationalDigits(value, countryCode).slice(0, 15);

export const getLanguages = (value: string) => (value ? [value] : []);

const emptyAcademicFormation = (): AcademicFormationForm => ({
  title: "",
  institution: "",
  graduation_year: "",
});

const hasAcademicFormationContent = (value: AcademicFormationForm) =>
  Boolean(value.title || value.institution || value.graduation_year);

const getAcademicFormations = (data?: FreeProfessionalProfile | null): AcademicFormationForm[] => {
  const formations =
    data?.profile.academic_formations?.map((item) => ({
      title: item.title || "",
      institution: item.institution || "",
      graduation_year: item.graduation_year || "",
    })) || [];

  if (formations.length > 0) return formations;

  const legacyFormation = {
    title: data?.profile.academic.title || "",
    institution: data?.profile.academic.institution || "",
    graduation_year: data?.profile.academic.graduation_year || "",
  };

  return hasAcademicFormationContent(legacyFormation)
    ? [legacyFormation]
    : [emptyAcademicFormation()];
};

const hasConfiguredProfile = (data?: FreeProfessionalProfile | null) => {
  return Boolean(
    data?.profile.headline ||
      data?.profile.bio ||
      data?.profile.modality ||
      data?.selected.specialties.length ||
      data?.selected.services.length,
  );
};

export const getDefaultValues = (data?: FreeProfessionalProfile | null): FreeProfileForm => {
  const countryCode = findCountryCallingCode(data?.profile.whatsapp);

  return {
    name: data?.user.name || "",
    gender: data?.profile.gender || "",
    race_color: data?.profile.race_color || "",
    religion: data?.profile.religion || "",
    cpf: data?.profile.cpf || "",
    crp_region: data?.profile.crp_region || "",
    crp_number: data?.profile.crp_number || "",
    countryCode,
    whatsapp: toWhatsappPhoneInput(data?.profile.whatsapp, countryCode),
    headline: data?.profile.headline || "",
    bio: data?.profile.bio || "",
    modality: (data?.profile.modality as FreeProfileForm["modality"]) || "",
    language: data?.profile.languages[0] || "Português",
    published: data ? Boolean(data.profile.published || !hasConfiguredProfile(data)) : true,
    discount_first_session: Boolean(data?.profile.discount_first_session),
    social_value: Boolean(data?.profile.social_value),
    accepts_insurance: Boolean(data?.profile.accepts_insurance),
    show_experience_tag: data?.profile.show_experience_tag ?? true,
    academic_formations: getAcademicFormations(data),
    address_street: data?.profile.address.street || "",
    address_number: data?.profile.address.number || "",
    address_complement: data?.profile.address.complement || "",
    address_district: data?.profile.address.district || "",
    address_zip: data?.profile.address.zip || "",
    address_city: data?.profile.address.city || "",
    address_state: data?.profile.address.state || "",
    specialty_ids: data?.selected.specialties.map((item) => item.id) || [],
    service_ids: data?.selected.services.map((item) => item.id) || [],
    approach_ids: data?.selected.approaches.map((item) => item.id) || [],
    target_audience: data?.profile.target_audience || [],
    available_days: data?.profile.available_days || [],
  };
};

export const useFreeProfileForm = (data?: FreeProfessionalProfile | null) => {
  const defaults = getDefaultValues(data);

  return useFormList<FreeProfileForm>({
    fields,
    schema: freeProfileSchema,
    defaultValues: defaults,
    values: defaults,
    resetOptions: {
      keepDirtyValues: true,
      keepErrors: true,
    },
  });
};

import { z } from "zod";
import type { FreeProfessionalProfile } from "@/api/generator/types/free-profile";
import { onlyDigits } from "@/components/controllers/utils";
import { type Field, useFormList } from "@/hooks/form";
import {
  COUNTRY_CALLING_CODE_OPTIONS,
  DEFAULT_COUNTRY_CALLING_CODE,
  findCountryCallingCode,
} from "@/utils/country-calling-codes";

export type FreeProfileForm = {
  name: string;
  cpf: string;
  crp_region: string;
  crp_number: string;
  countryCode: string;
  whatsapp: string;
  headline: string;
  bio: string;
  modality: "online" | "presencial" | "hibrido" | "";
  languagesText: string;
  published: boolean;
  specialty_ids: string[];
  service_ids: string[];
  approach_ids: string[];
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
    cpf: z
      .string()
      .refine((value) => !value || onlyDigits(value).length === 11, "Informe um CPF válido"),
    crp_region: z.string().trim().max(20, "Regional muito longa"),
    crp_number: z.string().trim().max(40, "Registro muito longo"),
    countryCode: z.string().min(1, "Selecione o país"),
    whatsapp: z.string(),
    headline: z.string().trim().min(3, "Informe um título profissional").max(160),
    bio: z.string().trim().min(20, "Escreva uma bio com pelo menos 20 caracteres").max(2000),
    modality: z.enum(["online", "presencial", "hibrido", ""], {
      message: "Selecione a modalidade",
    }),
    languagesText: z.string().trim().min(2, "Informe ao menos um idioma"),
    published: z.boolean(),
    specialty_ids: z.array(z.string()),
    service_ids: z.array(z.string()),
    approach_ids: z.array(z.string()),
  })
  .refine((data) => isPhoneLengthValid(data.whatsapp, data.countryCode), {
    message: "Informe um WhatsApp válido",
    path: ["whatsapp"],
  });

export const fields = [
  {
    name: "name",
    field: "input",
    label: "Nome profissional",
    placeholder: "Ex.: Roberto Silva",
    required: true,
    autoComplete: "name",
  },
  {
    name: "cpf",
    field: "cpf",
    label: "CPF",
    placeholder: "000.000.000-00",
    description: "Editável no plano gratuito; não dispara consulta CFP/CRP por API.",
    autoComplete: "off",
  },
  {
    name: "crp_region",
    field: "input",
    label: "Regional",
    placeholder: "Ex.: CRP-04",
  },
  {
    name: "crp_number",
    field: "input",
    label: "Registro",
    placeholder: "000000",
  },
  {
    name: "whatsapp",
    field: "phone",
    label: "WhatsApp profissional",
    placeholder: "(00) 00000-0000",
    countryCodeName: "countryCode",
    countryCodeOptions: COUNTRY_CALLING_CODE_OPTIONS,
    description: "O ícone ao lado do título abre o link gerado para teste.",
    required: true,
    autoComplete: "tel",
  },
  {
    name: "headline",
    field: "input",
    label: "Texto de apresentação curto",
    placeholder: "Ex.: Especialista em Relacionamentos",
    description: "Frase curta exibida no card público.",
    required: true,
  },
  {
    name: "bio",
    field: "textarea",
    label: "Bio",
    placeholder: "Escreva uma bio curta para o seu card.",
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
    name: "languagesText",
    field: "input",
    label: "Idiomas",
    placeholder: "Português, Inglês",
    description: "Separe por vírgula.",
    required: true,
  },
] satisfies Field<FreeProfileForm>[];

const toLanguagesText = (languages?: string[]) => (languages || []).join(", ");

const toWhatsappPhoneInput = (value?: string | null, countryCode = DEFAULT_COUNTRY_CALLING_CODE) =>
  getNationalDigits(value, countryCode).slice(0, 15);

export const parseLanguages = (value: string) => {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
};

export const getDefaultValues = (data?: FreeProfessionalProfile | null): FreeProfileForm => {
  const countryCode = findCountryCallingCode(data?.profile.whatsapp);

  return {
    name: data?.user.name || "",
    cpf: data?.profile.cpf || "",
    crp_region: data?.profile.crp_region || "",
    crp_number: data?.profile.crp_number || "",
    countryCode,
    whatsapp: toWhatsappPhoneInput(data?.profile.whatsapp, countryCode),
    headline: data?.profile.headline || "",
    bio: data?.profile.bio || "",
    modality: (data?.profile.modality as FreeProfileForm["modality"]) || "",
    languagesText: toLanguagesText(data?.profile.languages),
    published: Boolean(data?.profile.published),
    specialty_ids: data?.selected.specialties.map((item) => item.id) || [],
    service_ids: data?.selected.services.map((item) => item.id) || [],
    approach_ids: data?.selected.approaches.map((item) => item.id) || [],
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

import { z } from "zod";
import type {
  FreeProfessionalProfile,
  FreeProfileCatalogItem,
} from "@/api/generator/types/free-profile";
import { onlyDigits } from "@/components/controllers/utils";
import { type Field, type FieldOption, useFormList } from "@/hooks/form";
import {
  COUNTRY_CALLING_CODE_OPTIONS,
  DEFAULT_COUNTRY_CALLING_CODE,
  findCountryCallingCode,
} from "@/utils/country-calling-codes";
import {
  CRP_REGION_OPTIONS,
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  MODALITY_OPTIONS,
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
  professional_first_name: string;
  professional_last_name: string;
  gender: string;
  race_color: string | null;
  religion: string | null;
  cpf: string;
  birthdate: string;
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

export const toBirthdateIso = (value?: string | null) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value?.trim() ?? "");
  if (!match) return null;

  const [, dayValue, monthValue, yearValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const time = Date.UTC(year, month - 1, day);
  const parsed = new Date(time);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  const todayTime = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  if (time > todayTime || time < Date.UTC(1900, 0, 1)) {
    return null;
  }

  return `${yearValue}-${monthValue}-${dayValue}`;
};

const isValidBirthdate = (value: string) => Boolean(toBirthdateIso(value));

const toBirthdateInput = (value?: string | null) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  if (!match) return "";

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
};

export const freeProfileSchema = z
  .object({
    professional_first_name: z.string().trim().min(2, "Informe seu nome").max(80),
    professional_last_name: z.string().trim().min(1, "Informe seu sobrenome").max(120),
    gender: z.string().trim().min(1, "Selecione seu gênero").max(40),
    race_color: z.string().trim().max(40).nullable(),
    religion: z.string().trim().max(80).nullable(),
    cpf: z.string().refine((value) => onlyDigits(value).length === 11, "Informe um CPF válido"),
    birthdate: z
      .string()
      .trim()
      .min(1, "Informe sua data de nascimento")
      .refine(isValidBirthdate, "Informe uma data de nascimento válida"),
    crp_region: z
      .string()
      .trim()
      .min(1, "Selecione a Regional do CRP")
      .max(120, "Regional muito longa"),
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
      .max(120, "A bio curta deve ter no máximo 120 caracteres")
      .refine((value) => value.length === 0 || value.length >= 3, {
        message: "Informe uma bio com pelo menos 3 caracteres",
      }),
    bio: z
      .string()
      .trim()
      .max(2000)
      .refine((value) => value.length === 0 || value.length >= 20, {
        message: "Escreva uma apresentação com pelo menos 20 caracteres",
      }),
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
    target_audience: z.array(z.string()).min(1, "Selecione pelo menos um público"),
    available_days: z.array(z.string()),
  })
  .refine((data) => isPhoneLengthValid(data.whatsapp, data.countryCode), {
    message: "Informe um WhatsApp válido",
    path: ["whatsapp"],
  });

type ProfileCatalogFieldOptions = {
  genderOptions?: FieldOption[];
  languageOptions?: FieldOption[];
  raceColorOptions?: FieldOption[];
  religionOptions?: FieldOption[];
};

export const createFields = ({
  genderOptions = GENDER_OPTIONS,
  languageOptions = LANGUAGE_OPTIONS,
  raceColorOptions = RACE_COLOR_OPTIONS,
  religionOptions = RELIGION_OPTIONS,
}: ProfileCatalogFieldOptions = {}) =>
  [
    {
      name: "professional_first_name",
      field: "input",
      label: "Nome",
      placeholder: "Ex.: Roberto",
      after: (
        <span className="mt-1 block text-xs font-normal leading-5 text-muted">
          Esse nome aparece no botão de WhatsApp do seu perfil.
        </span>
      ),
      required: true,
      autoComplete: "given-name",
    },
    {
      name: "professional_last_name",
      field: "input",
      label: "Sobrenome",
      placeholder: "Ex.: Silva",
      required: true,
      autoComplete: "family-name",
    },
    {
      name: "gender",
      field: "select",
      label: "Gênero",
      placeholder: "Selecione seu gênero",
      options: genderOptions,
      required: true,
    },
    {
      name: "race_color",
      field: "select",
      label: "Raça/Cor",
      placeholder: "Selecione sua raça/cor",
      options: raceColorOptions,
    },
    {
      name: "religion",
      field: "select",
      label: "Religião",
      placeholder: "Selecione sua religião",
      options: religionOptions,
    },
    {
      name: "cpf",
      field: "cpf",
      label: "CPF",
      placeholder: "000.000.000-00",
      required: true,
      autoComplete: "off",
    },
    {
      name: "birthdate",
      field: "calendar",
      label: "Data de Nascimento",
      placeholder: "00/00/0000",
      required: true,
      autoComplete: "bday",
      dateDisplayFormat: "pt-BR",
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
      countryCodeClassName: "w-32 min-w-32 shrink-0 px-2 py-0.5",
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
      description: "Escreva brevemente a sua proposta de valor",
      max: 120,
      showCounter: true,
    },
    {
      name: "bio",
      field: "textarea",
      label: "Apresentação de texto",
      placeholder: "Conte sobre sua trajetória, experiência e como você ajuda seus pacientes.",
      rows: 6,
    },
    {
      name: "modality",
      field: "select",
      label: "Modalidades",
      required: true,
      options: MODALITY_OPTIONS,
    },
    {
      name: "language",
      field: "select",
      label: "Idiomas",
      placeholder: "Selecione o idioma",
      required: true,
      options: languageOptions,
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

export const fields = createFields();

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

const humanizeCatalogValue = (value: string) =>
  value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("pt-BR"));

const ensureCurrentOption = (
  options: FieldOption[],
  currentValue?: string | null,
  fallbackOptions: FieldOption[] = [],
) => {
  if (!currentValue || options.some((option) => option.value === currentValue)) return options;

  const fallbackLabel = fallbackOptions.find((option) => option.value === currentValue)?.label;

  return [
    ...options,
    {
      label: fallbackLabel ?? humanizeCatalogValue(currentValue),
      value: currentValue,
    },
  ];
};

const catalogSlugOptions = (items?: FreeProfileCatalogItem[] | null) =>
  (items ?? []).map((item) => ({ label: item.name, value: item.slug }));

const catalogNameOptions = (items?: FreeProfileCatalogItem[] | null) =>
  (items ?? []).map((item) => ({ label: item.name, value: item.name }));

const splitProfessionalNameFallback = (fullName?: string | null) => {
  const parts = String(fullName ?? "")
    .trim()
    .replace(/\s{2,}/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: parts[0] ?? "",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
  };
};
export const getDefaultValues = (data?: FreeProfessionalProfile | null): FreeProfileForm => {
  const countryCode = findCountryCallingCode(data?.profile.whatsapp);
  const fallbackName = splitProfessionalNameFallback(data?.user.name);

  return {
    professional_first_name: data?.profile.professional_first_name || fallbackName.firstName,
    professional_last_name: data?.profile.professional_last_name || fallbackName.lastName,
    gender: data?.profile.gender || "",
    race_color: data?.profile.race_color || "",
    religion: data?.profile.religion || "",
    cpf: data?.profile.cpf || "",
    birthdate: toBirthdateInput(data?.profile.birthdate),
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
    show_experience_tag: data?.plan.is_free
      ? false
      : Boolean(data?.profile.show_experience_tag ?? true),
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
  const genderOptions = catalogSlugOptions(data?.catalogs.genders);
  const languageOptions = catalogNameOptions(data?.catalogs.languages);
  const raceColorOptions = catalogSlugOptions(data?.catalogs.race_colors);
  const religionOptions = catalogSlugOptions(data?.catalogs.religions);

  return useFormList<FreeProfileForm>({
    fields: createFields({
      genderOptions: ensureCurrentOption(
        genderOptions.length > 0 ? genderOptions : GENDER_OPTIONS,
        defaults.gender,
        GENDER_OPTIONS,
      ),
      languageOptions: ensureCurrentOption(
        languageOptions.length > 0 ? languageOptions : LANGUAGE_OPTIONS,
        defaults.language,
        LANGUAGE_OPTIONS,
      ),
      raceColorOptions: ensureCurrentOption(
        raceColorOptions.length > 0 ? raceColorOptions : RACE_COLOR_OPTIONS,
        defaults.race_color,
        RACE_COLOR_OPTIONS,
      ),
      religionOptions: ensureCurrentOption(
        religionOptions.length > 0 ? religionOptions : RELIGION_OPTIONS,
        defaults.religion,
        RELIGION_OPTIONS,
      ),
    }),
    schema: freeProfileSchema,
    defaultValues: defaults,
    values: defaults,
    resetOptions: {
      keepDirtyValues: true,
      keepErrors: true,
    },
  });
};

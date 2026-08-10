import { useEffect } from "react";
import { z } from "zod";
import type { patient_profile, user } from "@/api/generator/types";
import { type Field, type FieldOption, useFormList } from "@/hooks/form";
import { CITY_OPTIONS_BY_STATE } from "../../professional/profile/setup/brazil-cities";
import { STATE_OPTIONS } from "../../professional/profile/setup/options";

const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

const patientGenders = ["feminino", "masculino", "nao_binario", "prefiro_nao_dizer"] as const;
const patientGoals = ["encontrar_psicologo", "conhecer_comunidade"] as const;
const brazilStates = [
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
type PatientGender = (typeof patientGenders)[number];
type PatientGoal = (typeof patientGoals)[number];
type PatientState = (typeof brazilStates)[number];

const isPatientGender = (value?: string | null): value is PatientGender =>
  patientGenders.includes(value as PatientGender);

const isPatientGoal = (value?: string | null): value is PatientGoal =>
  patientGoals.includes(value as PatientGoal);

const isPatientState = (value?: string | null): value is PatientState =>
  brazilStates.includes(value as PatientState);

const trimToNull = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || null;
};

export const patientGenderOptions = [
  { label: "Feminino", value: "feminino" },
  { label: "Masculino", value: "masculino" },
  { label: "Não binário", value: "nao_binario" },
  { label: "Prefiro não dizer", value: "prefiro_nao_dizer" },
] satisfies FieldOption[];

export const patientProfileSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome de exibição").max(120),
    gender: z.enum(patientGenders).nullable().optional(),
    goal: z.enum(patientGoals).nullable().optional(),
    birthdate: z
      .string()
      .nullable()
      .optional()
      .refine(
        (value) => {
          if (!value) return true;
          const date = new Date(`${value}T00:00:00`);
          return !Number.isNaN(date.getTime()) && date <= new Date();
        },
        { message: "Informe uma data de nascimento válida" },
      ),
    phone: z
      .string()
      .nullable()
      .optional()
      .refine(
        (value) => {
          const digits = onlyDigits(value);
          return digits.length === 0 || digits.length === 10 || digits.length === 11;
        },
        { message: "Informe um telefone válido" },
      ),
    bio: z.string().trim().max(280, "Use no máximo 280 caracteres").nullable().optional(),
    state: z.enum(brazilStates).nullable().optional(),
    city: z.string().trim().max(120, "Use no máximo 120 caracteres").nullable().optional(),
  })
  .superRefine((values, ctx) => {
    const city = trimToNull(values.city);
    const state = values.state ?? null;

    if (Boolean(city) !== Boolean(state)) {
      ctx.addIssue({
        code: "custom",
        message: "Informe estado e cidade ou deixe ambos em branco",
        path: ["city"],
      });
      return;
    }

    if (!city || !state) return;

    const cityExists = (CITY_OPTIONS_BY_STATE[state] ?? []).some(
      (option) => String(option.value) === city,
    );
    if (!cityExists) {
      ctx.addIssue({
        code: "custom",
        message: "Selecione uma cidade do estado informado",
        path: ["city"],
      });
    }
  });

export type PatientProfileForm = z.infer<typeof patientProfileSchema>;

type UsePatientProfileFormProps = {
  profile?: patient_profile | null;
  user?: user | null;
};

const customSelectStyles = {
  inputClassName: "pr-11",
  selectChevronClassName: "right-4",
  selectContentClassName:
    "top-[calc(100%+6px)] max-h-64 rounded-[var(--lectum-control-radius)] border-border bg-surface p-1.5 text-sm text-foreground shadow-[var(--lectum-shadow-soft)]",
  selectOptionClassName:
    "rounded-xl px-3 py-2 text-sm leading-5 text-foreground hover:bg-surface-muted hover:text-foreground active:bg-primary-soft",
  selectOptionSelectedClassName: "bg-primary-soft text-primary",
  useCustomSelect: true,
} satisfies Partial<Field<PatientProfileForm>>;

const genderSelectStyles = {
  ...customSelectStyles,
  emptyLabel: "Selecione seu gênero",
} satisfies Partial<Field<PatientProfileForm>>;

const fields = [
  {
    name: "name",
    field: "input",
    label: "Nome de exibição",
    description:
      "Não é necessário informar seu nome completo. Use o nome pelo qual deseja ser identificado na comunidade.",
    placeholder: "Ex: Roberto Silva",
    required: true,
    autoComplete: "name",
    max: 120,
  },
  {
    name: "gender",
    field: "select",
    label: "Gênero",
    placeholder: "Selecione seu gênero",
    options: patientGenderOptions,
    ...genderSelectStyles,
  },
  {
    name: "state",
    field: "select",
    label: "Estado",
    description: "Opcional. Use para aproximarmos psicólogos da sua região.",
    placeholder: "Selecione seu estado",
    options: STATE_OPTIONS,
    searchable: true,
    searchMode: "dropdown",
    ...customSelectStyles,
  },
  {
    name: "city",
    field: "select",
    label: "Cidade",
    placeholder: "Selecione sua cidade",
    emptyLabel: "Selecione sua cidade",
    searchable: true,
    searchMode: "dropdown",
    optionsByField: {
      name: "state",
      options: CITY_OPTIONS_BY_STATE,
      emptyLabel: "Selecione o estado primeiro",
    },
    ...customSelectStyles,
  },
] satisfies Field<PatientProfileForm>[];

export const toPatientProfilePayload = (
  values: PatientProfileForm,
  profile?: patient_profile | null,
) => ({
  name: values.name.trim(),
  gender: values.gender ?? null,
  goal: values.goal ?? (isPatientGoal(profile?.goal) ? profile.goal : null),
  birthdate: values.birthdate || profile?.birthdate?.slice(0, 10) || null,
  phone: onlyDigits(values.phone) || profile?.phone || null,
  bio: values.bio?.trim() || profile?.bio || null,
  city: trimToNull(values.city),
  state: values.state ?? null,
});

export const usePatientProfileForm = ({ profile, user }: UsePatientProfileFormProps = {}) => {
  const form = useFormList<PatientProfileForm>({
    fields,
    schema: patientProfileSchema,
    values: {
      name: user?.name || "",
      gender: isPatientGender(profile?.gender) ? profile.gender : null,
      goal: isPatientGoal(profile?.goal) ? profile.goal : null,
      birthdate: profile?.birthdate?.slice(0, 10) ?? null,
      phone: onlyDigits(profile?.phone).replace(/^55(?=\d{10,11}$)/, ""),
      bio: profile?.bio ?? "",
      state: isPatientState(profile?.state) ? profile.state : null,
      city: trimToNull(profile?.city),
    },
    resetOptions: {
      keepDirtyValues: true,
    },
  });

  const selectedState = form.hook.watch("state");

  useEffect(() => {
    const selectedCity = trimToNull(form.hook.getValues("city"));
    if (!selectedCity) return;

    if (!selectedState) {
      form.hook.setValue("city", null, { shouldDirty: true, shouldValidate: true });
      return;
    }

    const cityExists = (CITY_OPTIONS_BY_STATE[selectedState] ?? []).some(
      (option) => String(option.value) === selectedCity,
    );

    if (!cityExists) {
      form.hook.setValue("city", null, { shouldDirty: true, shouldValidate: true });
    }
  }, [form.hook, selectedState]);

  return form;
};

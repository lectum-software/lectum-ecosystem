import { z } from "zod";
import type { patient_profile, user } from "@/api/generator/types";
import { type Field, type FieldOption, useFormList } from "@/hooks/form";

const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

const patientGenders = ["feminino", "masculino", "nao_binario", "prefiro_nao_dizer"] as const;
const patientGoals = ["encontrar_psicologo", "conhecer_comunidade"] as const;
type PatientGender = (typeof patientGenders)[number];
type PatientGoal = (typeof patientGoals)[number];

const isPatientGender = (value?: string | null): value is PatientGender =>
  patientGenders.includes(value as PatientGender);

const isPatientGoal = (value?: string | null): value is PatientGoal =>
  patientGoals.includes(value as PatientGoal);

export const patientGenderOptions = [
  { label: "Feminino", value: "feminino" },
  { label: "Masculino", value: "masculino" },
  { label: "Não binário", value: "nao_binario" },
  { label: "Prefiro não dizer", value: "prefiro_nao_dizer" },
] satisfies FieldOption[];

export const patientGoalOptions = [
  { label: "Encontrar psicólogo", value: "encontrar_psicologo" },
  { label: "Conhecer comunidades", value: "conhecer_comunidade" },
] satisfies FieldOption[];

export const patientProfileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo").max(120),
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
});

export type PatientProfileForm = z.infer<typeof patientProfileSchema>;

type UsePatientProfileFormProps = {
  profile?: patient_profile | null;
  user?: user | null;
};

const fields = [
  {
    name: "name",
    field: "input",
    label: "Nome completo",
    placeholder: "Ex: Roberto Silva",
    required: true,
    autoComplete: "name",
    max: 120,
    showCounter: true,
  },
  {
    name: "gender",
    field: "select",
    label: "Gênero",
    placeholder: "Selecione seu gênero",
    options: patientGenderOptions,
  },
  {
    name: "goal",
    field: "select",
    label: "Preferência inicial",
    placeholder: "Como prefere usar a Lectum?",
    options: patientGoalOptions,
  },
  {
    name: "birthdate",
    field: "calendar",
    label: "Data de nascimento",
  },
  {
    name: "phone",
    field: "phone",
    label: "Telefone/WhatsApp",
    placeholder: "(00) 00000-0000",
    autoComplete: "tel",
  },
  {
    name: "bio",
    field: "textarea",
    label: "Sobre você",
    placeholder: "Conte brevemente o que você busca na Lectum.",
    rows: 4,
  },
] satisfies Field<PatientProfileForm>[];

export const toPatientProfilePayload = (values: PatientProfileForm) => ({
  name: values.name.trim(),
  gender: values.gender ?? null,
  goal: values.goal ?? null,
  birthdate: values.birthdate || null,
  phone: onlyDigits(values.phone) || null,
  bio: values.bio?.trim() || null,
});

export const usePatientProfileForm = ({ profile, user }: UsePatientProfileFormProps = {}) => {
  return useFormList<PatientProfileForm>({
    fields,
    schema: patientProfileSchema,
    values: {
      name: user?.name || "",
      gender: isPatientGender(profile?.gender) ? profile.gender : null,
      goal: isPatientGoal(profile?.goal) ? profile.goal : null,
      birthdate: profile?.birthdate?.slice(0, 10) ?? null,
      phone: onlyDigits(profile?.phone).replace(/^55(?=\d{10,11}$)/, ""),
      bio: profile?.bio ?? "",
    },
    resetOptions: {
      keepDirtyValues: true,
    },
  });
};

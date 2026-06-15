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

export const patientProfileSchema = z.object({
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

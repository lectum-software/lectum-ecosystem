import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";

export const patientOnboardingGoals = ["encontrar_psicologo", "conhecer_comunidade"] as const;
export const patientOnboardingGenders = [
  "feminino",
  "masculino",
  "nao_binario",
  "prefiro_nao_dizer",
] as const;

export const patientOnboardingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome e sobrenome")
    .max(120, "Use no máximo 120 caracteres"),
  gender: z
    .enum(patientOnboardingGenders)
    .nullable()
    .optional()
    .refine((value) => Boolean(value), {
      message: "Escolha seu gênero ou prefira não dizer",
    }),
  goal: z
    .enum(patientOnboardingGoals)
    .nullable()
    .optional()
    .refine((value) => Boolean(value), {
      message: "Escolha como prefere começar",
    }),
});

export type PatientOnboardingForm = z.infer<typeof patientOnboardingSchema>;

export const genderOptions = [
  {
    value: "feminino",
    label: "Feminino",
  },
  {
    value: "masculino",
    label: "Masculino",
  },
  {
    value: "nao_binario",
    label: "Não-binário",
  },
  {
    value: "prefiro_nao_dizer",
    label: "Prefiro não dizer",
  },
] satisfies Array<{
  value: (typeof patientOnboardingGenders)[number];
  label: string;
}>;

export const goalOptions = [
  {
    value: "encontrar_psicologo",
    title: "Escolher um psicólogo",
    description:
      "Vá direto ao ponto e encontre um profissional para a sua primeira sessão hoje mesmo.",
  },
  {
    value: "conhecer_comunidade",
    title: "Conhecer a comunidade",
    description: "Compartilhe o que sente e seja acolhido gratuitamente pelos psicólogos.",
  },
] satisfies Array<{
  value: (typeof patientOnboardingGoals)[number];
  title: string;
  description: string;
}>;

const fields = [
  {
    name: "name",
    field: "input",
    label: "Nome e sobrenome",
    placeholder: "Como você gostaria de ser chamado?",
    autoComplete: "name",
    required: true,
  },
] satisfies Field<PatientOnboardingForm>[];

export const useForm = (initialName = "") => {
  return useFormList<PatientOnboardingForm>({
    fields,
    schema: patientOnboardingSchema,
    defaultValues: {
      name: initialName,
      gender: null,
      goal: null,
    },
  });
};

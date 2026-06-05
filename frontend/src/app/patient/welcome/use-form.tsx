import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";

export const patientOnboardingGoals = ["encontrar_psicologo", "conhecer_comunidade"] as const;

export const patientOnboardingSchema = z.object({
  goal: z
    .enum(patientOnboardingGoals)
    .nullable()
    .optional()
    .refine((value) => Boolean(value), {
      message: "Escolha como prefere começar",
    }),
});

export type PatientOnboardingForm = z.infer<typeof patientOnboardingSchema>;

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

const fields = [] satisfies Field<PatientOnboardingForm>[];

export const useForm = () => {
  return useFormList<PatientOnboardingForm>({
    fields,
    schema: patientOnboardingSchema,
    defaultValues: {
      goal: null,
    },
  });
};

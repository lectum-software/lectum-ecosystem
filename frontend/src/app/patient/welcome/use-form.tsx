import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";

export const patientOnboardingGoals = ["encontrar_psicologo", "conhecer_comunidade"] as const;

const optionalDate = z
  .string()
  .nullable()
  .optional()
  .refine((value) => {
    if (!value) return true;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return false;

    return parsed <= new Date();
  }, "Informe uma data de nascimento válida");

const optionalPhone = z
  .string()
  .optional()
  .refine(
    (value) => {
      if (!value) return true;
      if (/^\d{10,11}$/.test(value)) return true;

      return value.startsWith("55") && /^\d{12,13}$/.test(value);
    },
    {
      message: "Informe um telefone com DDD",
    },
  );

export const patientOnboardingSchema = z.object({
  birthdate: optionalDate,
  phone: optionalPhone,
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
    description: "Vá direto ao ponto e encontre um profissional para sua primeira sessão.",
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
    name: "birthdate",
    field: "calendar",
    label: "Data de nascimento",
    description: "Opcional, mas ajuda a personalizar sua experiência.",
  },
  {
    name: "phone",
    field: "phone",
    label: "Telefone",
    description: "Opcional. Use DDD; guardaremos em formato seguro no perfil.",
    placeholder: "(00) 00000-0000",
  },
] satisfies Field<PatientOnboardingForm>[];

export const useForm = () => {
  return useFormList<PatientOnboardingForm>({
    fields,
    schema: patientOnboardingSchema,
    defaultValues: {
      birthdate: null,
      phone: "",
      goal: null,
    },
  });
};

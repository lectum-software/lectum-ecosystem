import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";

export const reviewFormSchema = z.object({
  psychologist_id: z.string().min(1, "Selecione o profissional avaliado."),
  rating: z
    .string()
    .min(1, "Selecione uma nota para o profissional.")
    .refine((value) => ["1", "2", "3", "4", "5"].includes(value), {
      message: "Selecione uma nota para o profissional.",
    }),
  comment: z
    .string({ error: "Escreva um depoimento sobre sua experiência." })
    .max(1000, "Use até 1000 caracteres no depoimento.")
    .refine((value) => value.trim().length > 0, {
      message: "Escreva um depoimento sobre sua experiência.",
    }),
});
export type ReviewFormValues = z.infer<typeof reviewFormSchema>;

export const useReviewForm = (psychologistId: string) => {
  const fields: Field<ReviewFormValues>[] = [
    { name: "psychologist_id", field: "input", label: "Profissional", hide: true },
    { name: "rating", field: "input", label: "Nota", hide: true },
    {
      name: "comment",
      field: "textarea",
      label: "Seu depoimento",
      placeholder: "Seu depoimento ajudará outros pacientes a encontrarem o profissional ideal",
      inputClassName: "min-h-32 resize-none",
    },
  ];

  return useFormList<ReviewFormValues>({
    fields,
    schema: reviewFormSchema,
    defaultValues: { psychologist_id: psychologistId, rating: "", comment: "" },
    values: { psychologist_id: psychologistId },
  });
};

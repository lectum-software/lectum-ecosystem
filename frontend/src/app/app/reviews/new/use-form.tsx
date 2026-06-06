import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";

export const reviewFormSchema = z.object({
  psychologist_id: z.string().min(1, "Selecione o profissional avaliado."),
  rating: z.enum(["1", "2", "3", "4", "5"], "Escolha uma nota de 1 a 5."),
  comment: z.string().max(1000, "Use até 1000 caracteres no depoimento.").optional().nullable(),
});
export type ReviewFormValues = z.infer<typeof reviewFormSchema>;

export const useReviewForm = (psychologistId: string) => {
  const fields: Field<ReviewFormValues>[] = [
    { name: "psychologist_id", field: "input", label: "Profissional", hide: true },
    {
      name: "rating",
      field: "select",
      label: "Sua nota para o profissional",
      placeholder: "Toque para avaliar",
      options: [5, 4, 3, 2, 1].map((value) => ({
        value: String(value),
        label: `${value} estrela${value === 1 ? "" : "s"}`,
      })),
    },
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
    defaultValues: { psychologist_id: psychologistId, rating: "5", comment: "" },
    values: { psychologist_id: psychologistId },
  });
};

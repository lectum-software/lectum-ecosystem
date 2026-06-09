import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";

export const reviewResponseSchema = z.object({
  response: z
    .string()
    .trim()
    .min(3, "Escreva uma resposta com pelo menos 3 caracteres.")
    .max(1000, "Use até 1000 caracteres na resposta."),
});

export type ReviewResponseFormValues = z.infer<typeof reviewResponseSchema>;

export const useReviewResponseForm = (initialResponse = "") => {
  const fields: Field<ReviewResponseFormValues>[] = [
    {
      name: "response",
      field: "textarea",
      label: "Sua resposta",
      placeholder: "Escreva uma resposta acolhedora e profissional...",
      inputClassName: "min-h-28 resize-none",
      showCounter: true,
      length: 1000,
    },
  ];

  return useFormList<ReviewResponseFormValues>({
    fields,
    schema: reviewResponseSchema,
    defaultValues: { response: initialResponse },
  });
};

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

export const useReviewResponseForm = (
  initialResponse = "",
  placeholder = "Escreva uma resposta acolhedora e profissional...",
) => {
  const fields: Field<ReviewResponseFormValues>[] = [
    {
      name: "response",
      field: "textarea",
      placeholder,
      inputClassName:
        "min-h-[84px] resize-none rounded-[16px] border-[#e5e7eb] bg-white px-4 py-3 text-[14px] leading-6 shadow-none placeholder:text-[#94a3b8] focus:border-[#308ce8] focus:ring-[#308ce8]/10",
    },
  ];

  return useFormList<ReviewResponseFormValues>({
    fields,
    schema: reviewResponseSchema,
    defaultValues: { response: initialResponse },
  });
};

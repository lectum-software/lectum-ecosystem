import { z } from "zod";
import type { SuggestCommunityPayload } from "@/api/generator/types/community";
import { type Field, useFormList } from "@/hooks/form";

export const suggestCommunitySchema = z.object({
  theme: z
    .string()
    .trim()
    .min(3, "Descreva o tema com pelo menos 3 caracteres")
    .max(240, "Use no máximo 240 caracteres"),
});

export type SuggestCommunityForm = z.infer<typeof suggestCommunitySchema>;

const fields = [
  {
    name: "theme",
    field: "textarea",
    label: "Tema da comunidade",
    placeholder: "Descreva o assunto que você gostaria de abordar...",
    required: true,
    rows: 6,
    max: 240,
    showCounter: true,
  },
] satisfies Field<SuggestCommunityForm>[];

export const toSuggestCommunityPayload = (
  values: SuggestCommunityForm,
): SuggestCommunityPayload => ({
  theme: values.theme.trim(),
});

export const useSuggestCommunityForm = () => {
  return useFormList<SuggestCommunityForm>({
    fields,
    schema: suggestCommunitySchema,
    defaultValues: {
      theme: "",
    },
  });
};

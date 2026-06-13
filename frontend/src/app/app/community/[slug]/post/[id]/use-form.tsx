import { useMemo } from "react";
import { z } from "zod";
import type { CreatePostReplyPayload } from "@/api/generator/types/posts";
import { type Field, useFormList } from "@/hooks/form";

export const replyComposerSchema = z.object({
  content: z
    .string()
    .trim()
    .min(3, "Escreva uma resposta com pelo menos 3 caracteres")
    .max(2000, "Use no máximo 2000 caracteres na resposta"),
});

export type ReplyComposerForm = z.infer<typeof replyComposerSchema>;

const buildFields = (replyingToName?: string | null) =>
  [
    {
      name: "content",
      field: "textarea",
      label: replyingToName ? `RESPONDER ${replyingToName}` : "ENTRAR NA DISCUSSÃO",
      placeholder: replyingToName
        ? "Escreva uma resposta curta e acolhedora..."
        : "Compartilhe sua experiência ou responda ao post...",
      required: true,
      rows: 4,
      max: 2000,
      autoGrow: true,
      inputClassName:
        "min-h-[112px] rounded-[18px] border-[#E5EAF0] bg-white px-4 py-4 text-sm leading-6 shadow-none placeholder:text-[#94A3B8] focus:border-[#308CE8] focus:ring-[#308CE8]/10 dark:bg-surface",
    },
  ] satisfies Field<ReplyComposerForm>[];

export const toCreatePostReplyPayload = (
  values: ReplyComposerForm,
  parentReplyId?: string | null,
): CreatePostReplyPayload => ({
  content: values.content.trim(),
  ...(parentReplyId ? { parentReplyId } : {}),
});

export const useReplyComposerForm = (replyingToName?: string | null) => {
  const fields = useMemo(() => buildFields(replyingToName), [replyingToName]);

  return useFormList<ReplyComposerForm>({
    fields,
    schema: replyComposerSchema,
    defaultValues: {
      content: "",
    },
  });
};

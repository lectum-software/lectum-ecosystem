import { useMemo } from "react";
import { z } from "zod";
import type {
  CreatePostReplyPayload,
  PostReportPayload,
  PostReportReason,
} from "@/api/generator/types/posts";
import { type Field, useFormList } from "@/hooks/form";

export const replyComposerSchema = z.object({
  content: z.string().trim().max(2000, "Use no máximo 2000 caracteres na resposta"),
});

export type ReplyComposerForm = z.infer<typeof replyComposerSchema>;

export const postReportSchema = z.object({
  description: z.string().trim().max(500, "Use no máximo 500 caracteres").optional(),
  reason: z.enum(["spam", "abuse", "self_harm", "privacy", "other"], {
    message: "Selecione um motivo para denunciar o post",
  }),
});

export type PostReportForm = z.infer<typeof postReportSchema>;

const buildFields = (replyingToName?: string | null) =>
  [
    {
      name: "content",
      field: "textarea",
      className: "gap-0 [&>span:last-child]:hidden",
      label: undefined,
      placeholder: replyingToName ? `Responder ${replyingToName}` : "Comentar no post",
      required: false,
      rows: 1,
      max: 2000,
      autoGrow: true,
      inputClassName:
        "min-h-[44px] max-h-[160px] rounded-[16px] border-border bg-surface px-3.5 py-2.5 text-sm leading-5 shadow-none placeholder:text-subtle focus:border-primary focus:ring-primary/10 dark:bg-surface",
    },
  ] satisfies Field<ReplyComposerForm>[];

const reportFields = [
  {
    name: "reason",
    field: "select",
    label: "Motivo da denúncia",
    placeholder: "Selecione um motivo",
    required: true,
    options: [
      { label: "Spam ou divulgação indevida", value: "spam" },
      { label: "Ofensa, assédio ou discurso de ódio", value: "abuse" },
      { label: "Incentivo à violência ou autolesão", value: "self_harm" },
      { label: "Exposição de dados pessoais", value: "privacy" },
      { label: "Outro motivo", value: "other" },
    ],
  },
  {
    name: "description",
    field: "textarea",
    label: "Detalhes adicionais",
    placeholder: "Descreva brevemente o que precisa ser analisado pela equipe Lectum.",
    rows: 3,
    max: 500,
    autoGrow: true,
    inputClassName:
      "min-h-[96px] rounded-[18px] border-border bg-surface px-4 py-3 text-sm leading-6 shadow-none placeholder:text-subtle focus:border-primary focus:ring-primary/10 dark:bg-surface",
  },
] satisfies Field<PostReportForm>[];

export const toCreatePostReplyPayload = (
  values: ReplyComposerForm,
  parentReplyId?: string | null,
  media?: { mediaType: "image" | "video"; mediaUrl: string; thumbnailUrl?: string } | null,
): CreatePostReplyPayload => ({
  content: values.content.trim(),
  ...(media ? media : {}),
  ...(parentReplyId ? { parentReplyId } : {}),
});

export const toPostReportPayload = (values: PostReportForm): PostReportPayload => ({
  description: values.description?.trim() || undefined,
  reason: values.reason as PostReportReason,
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

export const usePostReportForm = () => {
  return useFormList<PostReportForm>({
    fields: reportFields,
    schema: postReportSchema,
    defaultValues: {
      description: "",
      reason: "spam",
    },
  });
};

import { useMemo } from "react";
import { z } from "zod";
import type { CreateCommunityPostPayload } from "@/api/generator/types/community";
import { type Field, type FieldOption, useFormList } from "@/hooks/form";

export const createCommunityPostSchema = z.object({
  community_slug: z.string().min(1, "Escolha uma comunidade para postar"),
  title: z
    .string()
    .trim()
    .min(3, "Escreva um título com pelo menos 3 caracteres")
    .max(100, "Use no máximo 100 caracteres no título"),
  content: z
    .string()
    .trim()
    .min(10, "Escreva uma descrição com pelo menos 10 caracteres")
    .max(2000, "Use no máximo 2000 caracteres no texto"),
  anonymous: z.boolean().optional(),
});

export type CreateCommunityPostForm = z.infer<typeof createCommunityPostSchema>;

type UseCreateCommunityPostFormParams = {
  communityOptions: FieldOption[];
  defaultCommunitySlug?: string | null;
  isPsychologist: boolean;
  loadingCommunities?: boolean;
};

const contentGuidancePlaceholder =
  "Conte aos psicólogos o que aconteceu, como você está se sentindo e o que já tentou fazer até agora.";
const psychologistTitlePlaceholder = "Dê um título ao seu conteúdo";
const psychologistContentPlaceholder =
  "Compartilhe com a comunidade uma orientação, reflexão ou conteúdo baseado na sua experiência profissional.";

const buildFields = ({
  communityOptions,
  isPsychologist,
  loadingCommunities,
}: Pick<
  UseCreateCommunityPostFormParams,
  "communityOptions" | "isPsychologist" | "loadingCommunities"
>) =>
  [
    {
      name: "community_slug",
      field: "select",
      className:
        "relative w-fit max-w-full gap-0 pb-5 [&>span:last-child]:absolute [&>span:last-child]:top-11 [&>span:last-child]:left-0 [&>span:last-child]:w-max [&>span:last-child]:max-w-[calc(100vw-2.5rem)] [&>span:last-child]:pl-0",
      placeholder: "Selecionar comunidade",
      emptyLabel: "Selecionar comunidade",
      hideEmptyOption: true,
      options: communityOptions,
      loading: loadingCommunities,
      searchable: true,
      searchMode: "dropdown",
      searchPlaceholder: "Buscar comunidade",
      emptySearchLabel: "Nenhuma comunidade encontrada",
      required: true,
      inputClassName:
        "h-10 w-fit max-w-[calc(100vw-40px)] min-w-[188px] overflow-visible rounded-full border border-border/80 bg-surface px-4 py-0 text-sm font-[800] leading-[1.35] text-foreground shadow-[var(--lectum-shadow-soft)] hover:border-primary/25 hover:bg-background focus:border-primary/35 focus:ring-4 focus:ring-primary/10 [&>span]:text-foreground [&>span]:leading-[1.35]",
    },
    {
      name: "title",
      field: "contenteditable",
      id: "create-post-title",
      label: "Título do post",
      placeholder: isPsychologist
        ? psychologistTitlePlaceholder
        : "Título (Diga o assunto ou faça uma pergunta)",
      required: true,
      max: 100,
      autoFocus: true,
      rows: 1,
      autoGrow: true,
      className:
        "gap-0 [&>span:first-child]:sr-only [&>span:last-child]:min-h-3 [&>span:last-child]:leading-3",
      inputClassName:
        "create-post-title-input min-h-9 resize-none overflow-hidden rounded-none border-0 border-transparent bg-transparent px-0 pt-1 pb-0 shadow-none focus:border-transparent focus:ring-0",
    },
    {
      name: "content",
      field: "contenteditable",
      id: "create-post-content",
      label: "Conteúdo do post",
      placeholder: isPsychologist ? psychologistContentPlaceholder : contentGuidancePlaceholder,
      required: true,
      rows: 5,
      max: 2000,
      autoGrow: false,
      className:
        "min-h-0 flex h-full flex-1 flex-col gap-0 [&>span:first-child]:sr-only [&>span:last-child]:shrink-0",
      inputClassName:
        "create-post-content-input h-full min-h-0 flex-1 resize-none overflow-y-auto rounded-none border-0 border-transparent bg-transparent px-0 pt-0 pb-2 shadow-none focus:border-transparent focus:ring-0",
    },
    {
      name: "anonymous",
      field: "switch",
      label: "Publicar anonimamente",
      className: "hidden",
    },
  ] satisfies Field<CreateCommunityPostForm>[];

export const toCreateCommunityPostPayload = (
  values: CreateCommunityPostForm,
  isPsychologist: boolean,
): CreateCommunityPostPayload => ({
  title: values.title.trim(),
  content: values.content.trim(),
  anonymous: isPsychologist ? false : values.anonymous === true,
});

export const useCreateCommunityPostForm = ({
  communityOptions,
  defaultCommunitySlug,
  isPsychologist,
  loadingCommunities,
}: UseCreateCommunityPostFormParams) => {
  const fields = useMemo(
    () => buildFields({ communityOptions, isPsychologist, loadingCommunities }),
    [communityOptions, isPsychologist, loadingCommunities],
  );

  return useFormList<CreateCommunityPostForm>({
    fields,
    schema: createCommunityPostSchema,
    defaultValues: {
      community_slug: defaultCommunitySlug ?? "",
      title: "",
      content: "",
      anonymous: false,
    },
  });
};

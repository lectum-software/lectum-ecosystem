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
    .max(140, "Use no máximo 140 caracteres no título"),
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
      className: "w-fit gap-0",
      placeholder: "Comunidade",
      emptyLabel: "Comunidade",
      hideEmptyOption: true,
      options: communityOptions,
      loading: loadingCommunities,
      searchable: true,
      searchMode: "dropdown",
      searchPlaceholder: "Buscar comunidade",
      emptySearchLabel: "Nenhuma comunidade encontrada",
      required: true,
      inputClassName:
        "h-10 w-fit max-w-[calc(100vw-40px)] min-w-[188px] overflow-visible rounded-full border-transparent bg-surface-muted px-4 py-0 text-sm font-bold leading-[1.35] text-foreground shadow-none focus:border-transparent focus:ring-0 [&>span]:leading-[1.35]",
    },
    {
      name: "title",
      field: "input",
      id: "create-post-title",
      label: "Título do post",
      placeholder: "Título (Diga o assunto ou faça uma pergunta)",
      required: true,
      max: 140,
      autoFocus: true,
      className: "gap-0 [&>span:first-child]:sr-only",
      inputClassName:
        "h-auto rounded-none border-0 border-transparent bg-transparent px-0 py-2 text-[1.35rem] font-extrabold leading-tight tracking-[-0.03em] text-foreground shadow-none placeholder:text-muted focus:border-transparent focus:ring-0",
    },
    {
      name: "content",
      field: "textarea",
      id: "create-post-content",
      label: "Conteúdo do post",
      placeholder: contentGuidancePlaceholder,
      required: true,
      rows: isPsychologist ? 11 : 12,
      max: 2000,
      autoGrow: false,
      className: "min-h-0 gap-0 [&>span:first-child]:sr-only",
      inputClassName:
        "min-h-[44dvh] resize-none overflow-y-auto rounded-none border-0 border-transparent bg-transparent px-0 py-2 text-[1rem] leading-7 text-foreground shadow-none placeholder:text-muted/80 focus:border-transparent focus:ring-0 sm:min-h-[22rem]",
    },
    {
      name: "anonymous",
      field: "switch",
      label: "Deseja publicar anonimamente?",
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

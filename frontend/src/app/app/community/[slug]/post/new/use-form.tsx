import { useMemo } from "react";
import { z } from "zod";
import type { CreateCommunityPostPayload } from "@/api/generator/types/community";
import { type Field, type FieldOption, useFormList } from "@/hooks/form";

export const createCommunityPostSchema = z.object({
  community_slug: z.string().min(1, "Escolha uma comunidade para publicar"),
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
  "Conte o que aconteceu, como você se sente e o que já tentou fazer até agora. Dê o máximo de contexto possível para os psicólogos.";

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
      placeholder: "Escolher comunidade",
      emptyLabel: "Escolher comunidade",
      options: communityOptions,
      loading: loadingCommunities,
      searchable: true,
      searchMode: "dropdown",
      searchPlaceholder: "Buscar comunidade",
      emptySearchLabel: "Nenhuma comunidade encontrada",
      required: true,
      inputClassName:
        "h-10 w-fit max-w-[calc(100vw-36px)] min-w-[236px] rounded-full border-transparent bg-[#F5F7FA] px-4 text-sm font-semibold text-[#111827] shadow-none focus:border-transparent focus:ring-0 dark:bg-surface-muted",
    },
    {
      name: "title",
      field: "input",
      label: "TÍTULO",
      placeholder: isPsychologist
        ? "Assunto do seu post..."
        : "Diga o assunto ou faça uma pergunta...",
      required: true,
      max: 140,
      inputClassName:
        "h-[56px] rounded-2xl border-[#E5E7EB] bg-white px-4 text-base shadow-none placeholder:text-[#8A94A6] focus:border-[#308CE8] focus:ring-[#308CE8]/10 dark:bg-surface",
    },
    {
      name: "content",
      field: "textarea",
      label: "O QUE VOCÊ ESTÁ PENSANDO?",
      placeholder: contentGuidancePlaceholder,
      required: true,
      rows: 7,
      max: 2000,
      autoGrow: true,
      inputClassName:
        "min-h-[184px] rounded-2xl border-[#E5E7EB] bg-white px-4 py-4 text-base leading-6 shadow-none placeholder:text-[#8A94A6]/85 focus:border-[#308CE8] focus:ring-[#308CE8]/10 dark:bg-surface",
    },
    {
      name: "anonymous",
      field: "switch",
      label: "Postar como anônimo",
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

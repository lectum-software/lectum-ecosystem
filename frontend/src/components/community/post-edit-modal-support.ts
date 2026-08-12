import { z } from "zod";
import type { PostDetail } from "@/api/generator/types/posts";
import type { Field } from "@/hooks/form";
import { resolvePublicMediaUrl } from "@/utils/media";

export const COMMUNITY_SELECTOR_ICON_SRC = "/svg/public_24dp_64748B_FILL0_wght400_GRAD0_opsz24.svg";

export const COMMUNITY_POST_MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime";

export const MAX_POST_CAROUSEL_IMAGES = 10;

export const EDITOR_FIELD_IDS = new Set(["edit-post-title", "edit-post-content"]);

export const guidanceText =
  "Lembre-se de ser respeitoso com os outros membros. Conteúdos ofensivos ou que violem as diretrizes serão removidos pela moderação.";

export const postEditSchema = z.object({
  community_slug: z.string().min(1),
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

export type PostEditForm = z.infer<typeof postEditSchema>;

export type EditablePost = Pick<
  PostDetail,
  | "anonymous"
  | "author"
  | "community"
  | "content"
  | "id"
  | "media_items"
  | "media_type"
  | "media_url"
  | "thumbnail_url"
  | "replies_count"
  | "title"
>;

export type SelectedPostMedia = {
  file: File;
  id: string;
  orientation?: "landscape" | "portrait";
  previewUrl: string;
  type: "image" | "video";
};

export type PostMediaPreviewItem = {
  caption: string;
  id: string;
  orientation?: "landscape" | "portrait";
  src: string;
  thumbnailUrl?: string | null;
  type: "image" | "video";
};

export type EditablePostMediaPreviewItem = PostMediaPreviewItem & {
  selectedIndex?: number;
  source: "selected" | "stored";
};

export const resolveEditableMediaPreviewUrls = (mediaItem: EditablePostMediaPreviewItem) => {
  const mediaSrc =
    mediaItem.source === "stored"
      ? (resolvePublicMediaUrl(mediaItem.src) ?? mediaItem.src)
      : mediaItem.src;
  const thumbnailSrc = mediaItem.thumbnailUrl
    ? mediaItem.source === "stored"
      ? (resolvePublicMediaUrl(mediaItem.thumbnailUrl) ?? mediaItem.thumbnailUrl)
      : mediaItem.thumbnailUrl
    : null;

  return {
    imagePreviewSrc: mediaItem.type === "video" ? thumbnailSrc : mediaSrc,
    mediaSrc,
    shouldRenderImagePreview: mediaItem.type === "image" || Boolean(thumbnailSrc),
  };
};

export const createSelectedMediaId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export type PostEditModalProps = {
  onClose: () => void;
  onUpdated?: (post: PostDetail) => void;
  open: boolean;
  post: EditablePost;
};

export const contentGuidancePlaceholder =
  "Conte aos psicólogos o que aconteceu, como você está se sentindo e o que já tentou fazer até agora.";

export const psychologistTitlePlaceholder = "Dê um título ao seu conteúdo";

export const psychologistContentPlaceholder =
  "Compartilhe com a comunidade uma orientação, reflexão ou conteúdo baseado na sua experiência profissional.";

export const buildFields = ({
  communityName,
  communitySlug,
  isPsychologist,
}: {
  communityName: string;
  communitySlug: string;
  isPsychologist: boolean;
}) =>
  [
    {
      name: "community_slug",
      field: "select",
      className:
        "relative w-fit max-w-full gap-0 pb-5 [&>span:last-child]:absolute [&>span:last-child]:top-11 [&>span:last-child]:left-0 [&>span:last-child]:w-max [&>span:last-child]:max-w-[calc(100vw-2.5rem)] [&>span:last-child]:pl-0",
      placeholder: "Comunidade",
      emptyLabel: "Comunidade",
      hideEmptyOption: true,
      options: [{ label: communityName, value: communitySlug }],
      required: true,
      disabled: true,
      readOnly: true,
      inputClassName:
        "h-10 w-fit max-w-[calc(100vw-40px)] min-w-[188px] cursor-not-allowed overflow-visible rounded-full border-transparent bg-surface-muted px-4 py-0 text-sm font-bold leading-[1.35] text-muted opacity-75 shadow-none focus:border-transparent focus:ring-0 [&>span]:leading-[1.35]",
    },
    {
      name: "title",
      field: "textarea",
      id: "edit-post-title",
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
      field: "textarea",
      id: "edit-post-content",
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
  ] satisfies Field<PostEditForm>[];

export const normalizeMediaType = (value?: string | null): "image" | "video" | null => {
  if (value === "image" || value === "video") return value;

  return null;
};

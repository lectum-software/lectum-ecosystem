import type { Prisma } from "@/external/generated/prisma/client";

export const SEO_METADATA_PAGE_KEYS = [
  "default",
  "home",
  "psychologists",
  "psychologist_profile",
  "community",
  "community_detail",
  "community_post",
  "community_post_reply",
  "top_mentors",
  "app_profile",
  "app_favorites",
  "app_notifications",
] as const;

export type SeoMetadataPageKey = (typeof SEO_METADATA_PAGE_KEYS)[number];

export const PRIVATE_SEO_METADATA_PAGE_KEYS = [
  "app_profile",
  "app_favorites",
  "app_notifications",
] as const satisfies readonly SeoMetadataPageKey[];

export const DEFAULT_OPEN_GRAPH_IMAGE_URL = "/lectum-og-default.png";

export type SeoMetadataSettingPayload = {
  canonical_url?: string | null;
  description: string;
  keywords?: string[] | null;
  og_description?: string | null;
  og_image_url?: string | null;
  og_title?: string | null;
  robots_follow: boolean;
  robots_index: boolean;
  title: string;
};

export type SeoMetadataSettingDTO = SeoMetadataSettingPayload & {
  created_at: Date;
  id: string;
  label: string;
  page_key: SeoMetadataPageKey;
  route_path: string | null;
  updated_at: Date;
};

export type SeoMetadataSettingsDTO = {
  settings: SeoMetadataSettingDTO[];
  updated_at: Date | null;
};

type SeoMetadataDefault = SeoMetadataSettingPayload & {
  id: string;
  label: string;
  page_key: SeoMetadataPageKey;
  route_path: string | null;
};

export const SEO_METADATA_DEFAULTS: readonly SeoMetadataDefault[] = [
  {
    canonical_url: null,
    description:
      "Lectum conecta pacientes e psicólogos em uma comunidade de perguntas e respostas sobre saúde mental.",
    id: "site-seo-default",
    keywords: ["psicologia", "saúde mental", "psicólogos", "terapia online"],
    label: "Padrão do site",
    og_description:
      "Lectum conecta pacientes e psicólogos em uma comunidade de perguntas e respostas sobre saúde mental.",
    og_image_url: DEFAULT_OPEN_GRAPH_IMAGE_URL,
    og_title: "Lectum | Psicologia em comunidade",
    page_key: "default",
    robots_follow: true,
    robots_index: true,
    route_path: null,
    title: "Lectum | Psicologia em comunidade",
  },
  {
    canonical_url: "/",
    description:
      "Feed público da Lectum com perguntas, relatos e respostas de psicólogos em comunidades de saúde mental.",
    id: "site-seo-home",
    keywords: ["psicologia", "saúde mental", "comunidade", "perguntas sobre psicologia"],
    label: "Início / Feed público",
    og_description:
      "Feed público da Lectum com perguntas, relatos e respostas de psicólogos em comunidades de saúde mental.",
    og_image_url: DEFAULT_OPEN_GRAPH_IMAGE_URL,
    og_title: "Lectum | Psicologia em comunidade",
    page_key: "home",
    robots_follow: true,
    robots_index: true,
    route_path: "/",
    title: "Início | Lectum",
  },
  {
    canonical_url: "/psicologos",
    description:
      "Encontre psicólogos na Lectum por especialidade, abordagem, serviço, idioma e disponibilidade.",
    id: "site-seo-psychologists",
    keywords: ["psicólogos", "terapia online", "especialidades psicológicas", "psicologia"],
    label: "Busca de psicólogos",
    og_description:
      "Encontre psicólogos na Lectum por especialidade, abordagem, serviço, idioma e disponibilidade.",
    og_image_url: DEFAULT_OPEN_GRAPH_IMAGE_URL,
    og_title: "Psicólogos | Lectum",
    page_key: "psychologists",
    robots_follow: true,
    robots_index: true,
    route_path: "/psicologos",
    title: "Psicólogos | Lectum",
  },
  {
    canonical_url: null,
    description:
      "Perfil público de psicólogo na Lectum, com informações profissionais e participação em comunidades.",
    id: "site-seo-psychologist-profile",
    keywords: ["perfil de psicólogo", "psicólogo online", "saúde mental"],
    label: "Perfil público de psicólogo",
    og_description:
      "Perfil público de psicólogo na Lectum, com informações profissionais e participação em comunidades.",
    og_image_url: DEFAULT_OPEN_GRAPH_IMAGE_URL,
    og_title: "Perfil de psicólogo | Lectum",
    page_key: "psychologist_profile",
    robots_follow: true,
    robots_index: true,
    route_path: "/psicologos/[id]",
    title: "Perfil de psicólogo | Lectum",
  },
  {
    canonical_url: "/comunidades",
    description:
      "Comunidades públicas da Lectum com perguntas, relatos e respostas responsáveis sobre saúde mental.",
    id: "site-seo-community",
    keywords: ["comunidade de saúde mental", "perguntas sobre psicologia", "psicólogos"],
    label: "Explorar comunidades",
    og_description:
      "Comunidades públicas da Lectum com perguntas, relatos e respostas responsáveis sobre saúde mental.",
    og_image_url: DEFAULT_OPEN_GRAPH_IMAGE_URL,
    og_title: "Comunidades | Lectum",
    page_key: "community",
    robots_follow: true,
    robots_index: true,
    route_path: "/comunidades",
    title: "Comunidades | Lectum",
  },
  {
    canonical_url: null,
    description:
      "Comunidade pública da Lectum com perguntas, relatos e respostas responsáveis sobre saúde mental.",
    id: "site-seo-community-detail",
    keywords: ["comunidade de saúde mental", "perguntas sobre psicologia", "psicólogos"],
    label: "Comunidade",
    og_description:
      "Comunidade pública da Lectum com perguntas, relatos e respostas responsáveis sobre saúde mental.",
    og_image_url: DEFAULT_OPEN_GRAPH_IMAGE_URL,
    og_title: "Comunidade | Lectum",
    page_key: "community_detail",
    robots_follow: true,
    robots_index: true,
    route_path: "/comunidades/[slug]",
    title: "Comunidade | Lectum",
  },
  {
    canonical_url: null,
    description:
      "Pergunta ou relato público de comunidade na Lectum, com respostas e contexto responsável.",
    id: "site-seo-community-post",
    keywords: ["pergunta de psicologia", "relato de saúde mental", "comunidade Lectum"],
    label: "Post de comunidade",
    og_description:
      "Pergunta ou relato público de comunidade na Lectum, com respostas e contexto responsável.",
    og_image_url: DEFAULT_OPEN_GRAPH_IMAGE_URL,
    og_title: "Pergunta da comunidade | Lectum",
    page_key: "community_post",
    robots_follow: true,
    robots_index: true,
    route_path: "/comunidades/[slug]/publicacao/[id]",
    title: "Pergunta da comunidade | Lectum",
  },
  {
    canonical_url: null,
    description:
      "Resposta pública de comentário na Lectum, com contexto da publicação e discussão da comunidade.",
    id: "site-seo-community-post-reply",
    keywords: ["resposta de psicólogo", "comentário de comunidade", "saúde mental"],
    label: "Resposta de comentário",
    og_description:
      "Resposta pública de comentário na Lectum, com contexto da publicação e discussão da comunidade.",
    og_image_url: DEFAULT_OPEN_GRAPH_IMAGE_URL,
    og_title: "Resposta da comunidade | Lectum",
    page_key: "community_post_reply",
    robots_follow: true,
    robots_index: true,
    route_path: "/comunidades/[slug]/publicacao/[id]/resposta/[replyId]",
    title: "Resposta da comunidade | Lectum",
  },
  {
    canonical_url: "/comunidades/top-mentores",
    description: "Ranking público de mentores das comunidades da Lectum.",
    id: "site-seo-top-mentors",
    keywords: ["mentores", "psicólogos", "comunidades de saúde mental"],
    label: "Top Mentores",
    og_description: "Ranking público de mentores das comunidades da Lectum.",
    og_image_url: DEFAULT_OPEN_GRAPH_IMAGE_URL,
    og_title: "Top Mentores | Lectum",
    page_key: "top_mentors",
    robots_follow: true,
    robots_index: true,
    route_path: "/comunidades/top-mentores",
    title: "Top Mentores | Lectum",
  },
  {
    canonical_url: "/app/perfil",
    description:
      "Página privada de perfil do usuário na Lectum, com dados pessoais e atalhos de conta.",
    id: "site-seo-app-profile",
    keywords: ["perfil Lectum", "conta Lectum", "dados do usuário"],
    label: "Perfil do usuário",
    og_description:
      "Página privada de perfil do usuário na Lectum, com dados pessoais e atalhos de conta.",
    og_image_url: DEFAULT_OPEN_GRAPH_IMAGE_URL,
    og_title: "Perfil | Lectum",
    page_key: "app_profile",
    robots_follow: false,
    robots_index: false,
    route_path: "/app/perfil",
    title: "Perfil | Lectum",
  },
  {
    canonical_url: "/app/favoritos",
    description: "Página privada de favoritos da Lectum, reunindo psicólogos salvos pelo usuário.",
    id: "site-seo-app-favorites",
    keywords: ["favoritos Lectum", "psicólogos favoritos", "conta Lectum"],
    label: "Favoritos do usuário",
    og_description:
      "Página privada de favoritos da Lectum, reunindo psicólogos salvos pelo usuário.",
    og_image_url: DEFAULT_OPEN_GRAPH_IMAGE_URL,
    og_title: "Favoritos | Lectum",
    page_key: "app_favorites",
    robots_follow: false,
    robots_index: false,
    route_path: "/app/favoritos",
    title: "Favoritos | Lectum",
  },
  {
    canonical_url: "/app/notificacoes",
    description:
      "Página privada de notificações da Lectum, com atualizações da conta e das comunidades.",
    id: "site-seo-app-notifications",
    keywords: ["notificações Lectum", "alertas Lectum", "conta Lectum"],
    label: "Notificações do usuário",
    og_description:
      "Página privada de notificações da Lectum, com atualizações da conta e das comunidades.",
    og_image_url: DEFAULT_OPEN_GRAPH_IMAGE_URL,
    og_title: "Notificacoes | Lectum",
    page_key: "app_notifications",
    robots_follow: false,
    robots_index: false,
    route_path: "/app/notificacoes",
    title: "Notificacoes | Lectum",
  },
] as const;

export const isSeoMetadataPageKey = (value: unknown): value is SeoMetadataPageKey =>
  typeof value === "string" && SEO_METADATA_PAGE_KEYS.includes(value as SeoMetadataPageKey);

export const isPrivateSeoMetadataPageKey = (value: SeoMetadataPageKey) =>
  PRIVATE_SEO_METADATA_PAGE_KEYS.includes(value as (typeof PRIVATE_SEO_METADATA_PAGE_KEYS)[number]);

const SEO_METADATA_DEFAULT_BY_PAGE_KEY = new Map<
  SeoMetadataPageKey,
  (typeof SEO_METADATA_DEFAULTS)[number]
>(SEO_METADATA_DEFAULTS.map((setting) => [setting.page_key, setting] as const));

const resolveSeoMetadataLabel = (pageKey: string, fallback: string) =>
  SEO_METADATA_DEFAULT_BY_PAGE_KEY.get(pageKey as SeoMetadataPageKey)?.label ?? fallback;

const keywordsFromJson = (value: Prisma.JsonValue | null): string[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

export const toSeoMetadataSettingDTO = (setting: {
  canonical_url: string | null;
  createdAt: Date;
  description: string;
  id: string;
  keywords: Prisma.JsonValue | null;
  label: string;
  og_description: string | null;
  og_image_url: string | null;
  og_title: string | null;
  page_key: string;
  robots_follow: boolean;
  robots_index: boolean;
  route_path: string | null;
  title: string;
  updatedAt: Date;
}): SeoMetadataSettingDTO => ({
  canonical_url: setting.canonical_url,
  created_at: setting.createdAt,
  description: setting.description,
  id: setting.id,
  keywords: keywordsFromJson(setting.keywords),
  label: resolveSeoMetadataLabel(setting.page_key, setting.label),
  og_description: setting.og_description,
  og_image_url: setting.og_image_url,
  og_title: setting.og_title,
  page_key: isSeoMetadataPageKey(setting.page_key) ? setting.page_key : "default",
  robots_follow: setting.robots_follow,
  robots_index: setting.robots_index,
  route_path: setting.route_path,
  title: setting.title,
  updated_at: setting.updatedAt,
});

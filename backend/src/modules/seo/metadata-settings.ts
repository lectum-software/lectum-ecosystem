import type { Prisma } from "@/external/generated/prisma/client";

export const SEO_METADATA_PAGE_KEYS = [
  "default",
  "home",
  "psychologists",
  "psychologist_profile",
  "community",
  "community_detail",
  "community_post",
  "top_mentors",
] as const;

export type SeoMetadataPageKey = (typeof SEO_METADATA_PAGE_KEYS)[number];

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
    og_image_url: "/logo-light.png",
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
    og_image_url: "/logo-light.png",
    og_title: "Lectum | Psicologia em comunidade",
    page_key: "home",
    robots_follow: true,
    robots_index: true,
    route_path: "/",
    title: "Início | Lectum",
  },
  {
    canonical_url: "/psychologists",
    description:
      "Encontre psicólogos na Lectum por especialidade, abordagem, serviço, idioma e disponibilidade.",
    id: "site-seo-psychologists",
    keywords: ["psicólogos", "terapia online", "especialidades psicológicas", "psicologia"],
    label: "Busca de psicólogos",
    og_description:
      "Encontre psicólogos na Lectum por especialidade, abordagem, serviço, idioma e disponibilidade.",
    og_image_url: "/logo-light.png",
    og_title: "Psicólogos | Lectum",
    page_key: "psychologists",
    robots_follow: true,
    robots_index: true,
    route_path: "/psychologists",
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
    og_image_url: "/logo-light.png",
    og_title: "Perfil de psicólogo | Lectum",
    page_key: "psychologist_profile",
    robots_follow: true,
    robots_index: true,
    route_path: "/psychologists/[id]",
    title: "Perfil de psicólogo | Lectum",
  },
  {
    canonical_url: "/community",
    description:
      "Comunidades públicas da Lectum com perguntas, relatos e respostas responsáveis sobre saúde mental.",
    id: "site-seo-community",
    keywords: ["comunidade de saúde mental", "perguntas sobre psicologia", "psicólogos"],
    label: "Explorar comunidades",
    og_description:
      "Comunidades públicas da Lectum com perguntas, relatos e respostas responsáveis sobre saúde mental.",
    og_image_url: "/logo-light.png",
    og_title: "Comunidades | Lectum",
    page_key: "community",
    robots_follow: true,
    robots_index: true,
    route_path: "/community",
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
    og_image_url: "/logo-light.png",
    og_title: "Comunidade | Lectum",
    page_key: "community_detail",
    robots_follow: true,
    robots_index: true,
    route_path: "/community/[slug]",
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
    og_image_url: "/logo-light.png",
    og_title: "Pergunta da comunidade | Lectum",
    page_key: "community_post",
    robots_follow: true,
    robots_index: true,
    route_path: "/community/[slug]/post/[id]",
    title: "Pergunta da comunidade | Lectum",
  },
  {
    canonical_url: "/community/top-mentors",
    description: "Ranking público de mentores das comunidades da Lectum.",
    id: "site-seo-top-mentors",
    keywords: ["mentores", "psicólogos", "comunidades de saúde mental"],
    label: "Top Mentores",
    og_description: "Ranking público de mentores das comunidades da Lectum.",
    og_image_url: "/logo-light.png",
    og_title: "Top Mentores | Lectum",
    page_key: "top_mentors",
    robots_follow: true,
    robots_index: true,
    route_path: "/community/top-mentors",
    title: "Top Mentores | Lectum",
  },
] as const;

export const isSeoMetadataPageKey = (value: unknown): value is SeoMetadataPageKey =>
  typeof value === "string" && SEO_METADATA_PAGE_KEYS.includes(value as SeoMetadataPageKey);

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

export const COMMUNITY_FEED_CHIPS = [
  {
    label: "Ansiedade",
    name: "Ansiedade em Equilíbrio",
    slug: "ansiedade-em-equilibrio",
  },
  {
    label: "Relacionamentos",
    name: "Relacionamentos com Propósito",
    slug: "relacionamentos-com-proposito",
  },
  {
    label: "Mulheres",
    name: "Mulheres em Foco",
    slug: "mulheres-em-foco",
  },
  {
    label: "Autocuidado",
    name: "Autocuidado em Prática",
    slug: "autocuidado-em-pratica",
  },
  {
    label: "Luto",
    name: "Luto e Ressignificação",
    slug: "luto-e-ressignificacao",
  },
] as const;

export const DEFAULT_COMMUNITY_SLUG = COMMUNITY_FEED_CHIPS[0].slug;
export const COMMUNITY_EXPLORE_HREF = "/app/community";
export const COMMUNITY_FEED_SLUG = "feed";
export const DEFAULT_COMMUNITY_FEED_HREF = `/app/community/${COMMUNITY_FEED_SLUG}`;
export const COMMUNITY_CREATE_POST_HREF = "/app/community/post/new";

export const getCommunityFeedChip = (slug?: string | null) => {
  return COMMUNITY_FEED_CHIPS.find((item) => item.slug === slug) ?? null;
};

export const findCommunityFeedChip = (slug?: string | null) => {
  return getCommunityFeedChip(slug) ?? COMMUNITY_FEED_CHIPS[0];
};

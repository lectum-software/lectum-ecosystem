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
export const DEFAULT_COMMUNITY_FEED_HREF = `/app/community/${DEFAULT_COMMUNITY_SLUG}`;

export const findCommunityFeedChip = (slug?: string | null) => {
  return COMMUNITY_FEED_CHIPS.find((item) => item.slug === slug) ?? COMMUNITY_FEED_CHIPS[0];
};

export const COMMUNITY_FEED_CHIPS = [
  {
    iconUrl: "/community/icons/ansiedade.png",
    label: "Ansiedade",
    name: "Ansiedade em Equilíbrio",
    slug: "ansiedade-em-equilibrio",
  },
  {
    iconUrl: "/community/icons/relacionamentos.png",
    label: "Relacionamentos",
    name: "Relacionamentos com Propósito",
    slug: "relacionamentos-com-proposito",
  },
  {
    iconUrl: "/community/icons/autocuidado.png",
    label: "Autocuidado",
    name: "Autocuidado em Pequenos Passos",
    slug: "autocuidado-em-pratica",
  },
  {
    iconUrl: "/community/icons/depressao.png",
    label: "Depressão",
    name: "Depressão: Redescobrindo a Vida",
    slug: "depressao",
  },
  {
    iconUrl: "/community/icons/tdah.png",
    label: "TDAH",
    name: "TDAH: Encontrando seu Ritmo",
    slug: "tdah",
  },
] as const;

export const DEFAULT_COMMUNITY_SLUG = COMMUNITY_FEED_CHIPS[0].slug;
export const COMMUNITY_EXPLORE_HREF = "/community";
export const COMMUNITY_FEED_SLUG = "feed";
export const LEGACY_COMMUNITY_FEED_HREF = `/community/${COMMUNITY_FEED_SLUG}`;
export const DEFAULT_COMMUNITY_FEED_HREF = "/";
export const COMMUNITY_CREATE_POST_HREF = `/app/community/${COMMUNITY_FEED_SLUG}/post/new`;

export const getCommunityFeedChip = (slug?: string | null) => {
  return COMMUNITY_FEED_CHIPS.find((item) => item.slug === slug) ?? null;
};

export const findCommunityFeedChip = (slug?: string | null) => {
  return getCommunityFeedChip(slug) ?? COMMUNITY_FEED_CHIPS[0];
};

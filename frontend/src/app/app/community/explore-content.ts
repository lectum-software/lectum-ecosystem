import type { Community } from "@/api/generator/types/community";

export type CommunityExploreContent = {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  category?: string;
  isFeatured?: boolean;
  isPopular?: boolean;
  growthLabel?: string;
};

export type CommunityExploreCard = CommunityExploreContent & {
  communityId: string;
  slug: string;
  membersCount: number;
};

const DEFAULT_COMMUNITY_IMAGE = "/images/community/explore/autocuidado.png";

const COMMUNITY_EXPLORE_CONTENT_BY_SLUG: Record<string, CommunityExploreContent> = {
  "ansiedade-em-equilibrio": {
    id: "explore-ansiedade-em-equilibrio",
    name: "Ansiedade em Equilíbrio",
    imageUrl: "/images/community/explore/ansiedade.png",
    description:
      "Acolhimento para conversar sobre ansiedade, rotina e estratégias de regulação emocional.",
    category: "Ansiedade",
    isPopular: true,
    growthLabel: "Destaque",
  },
  depressao: {
    id: "explore-depressao",
    name: "Depressão",
    imageUrl: "/images/community/explore/depressao.png",
    description:
      "Apoio para falar sobre desânimo, isolamento, recaídas e caminhos possíveis de cuidado.",
    category: "Depressão",
    isPopular: true,
    growthLabel: "Nova",
  },
  tdah: {
    id: "explore-tdah",
    name: "TDAH",
    imageUrl: "/images/community/explore/tdah.png",
    description:
      "Trocas sobre foco, organização, impulsividade e rotina com acolhimento e informação.",
    category: "TDAH",
    isPopular: true,
    growthLabel: "Nova",
  },
  "autocuidado-em-pratica": {
    id: "explore-autocuidado-em-pratica",
    name: "Autocuidado em Prática",
    imageUrl: "/images/community/explore/autocuidado.png",
    description:
      "Práticas realistas para cuidar de si, criar pequenos hábitos e sustentar bem-estar.",
    category: "Autocuidado",
    isFeatured: true,
    isPopular: true,
    growthLabel: "Destaque",
  },
  "relacionamentos-com-proposito": {
    id: "explore-relacionamentos-com-proposito",
    name: "Relacionamentos com Propósito",
    imageUrl: "/images/community/explore/relacionamentos.png",
    description:
      "Reflexões sobre vínculos, comunicação, limites saudáveis e relações mais conscientes.",
    category: "Relacionamentos",
    isPopular: true,
  },
};

const fallbackImageByIndex = [
  "/images/community/explore/ansiedade.png",
  "/images/community/explore/relacionamentos.png",
  DEFAULT_COMMUNITY_IMAGE,
  "/images/community/explore/depressao.png",
  "/images/community/explore/tdah.png",
];

export const buildCommunityExploreCard = (
  community: Community,
  index: number,
): CommunityExploreCard => {
  const content = COMMUNITY_EXPLORE_CONTENT_BY_SLUG[community.slug];
  const imageUrl =
    content?.imageUrl ||
    community.avatar_url ||
    fallbackImageByIndex[index % fallbackImageByIndex.length];

  return {
    id: content?.id ?? `explore-${community.slug}`,
    communityId: community.id,
    slug: community.slug,
    name: content?.name ?? community.name,
    imageUrl,
    description: content?.description ?? community.description ?? "Comunidade Lectum",
    category: content?.category ?? community.category ?? undefined,
    isFeatured: content?.isFeatured ?? false,
    isPopular: content?.isPopular ?? true,
    growthLabel: content?.growthLabel,
    membersCount: community.members_count,
  };
};

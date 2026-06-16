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

const DEFAULT_COMMUNITY_IMAGE = "/images/community/explore/mindfulness-self-care.png";

const COMMUNITY_EXPLORE_CONTENT_BY_SLUG: Record<string, CommunityExploreContent> = {
  "ansiedade-em-equilibrio": {
    id: "explore-ansiedade-em-equilibrio",
    name: "Ansiedade em equilíbrio",
    imageUrl: "/images/community/explore/anxiety-support.png",
    description:
      "Acolhimento para conversar sobre ansiedade, rotina e estratégias de regulação emocional.",
    category: "Saúde emocional",
    isPopular: true,
    growthLabel: "Destaque",
  },
  "autocuidado-em-pratica": {
    id: "explore-autocuidado-em-pratica",
    name: "Autocuidado em prática",
    imageUrl: "/images/community/explore/mindfulness-self-care.png",
    description:
      "Práticas realistas para cuidar de si, criar pequenos hábitos e sustentar bem-estar.",
    category: "Autocuidado",
    isFeatured: true,
    isPopular: true,
    growthLabel: "Destaque",
  },
  "luto-e-ressignificacao": {
    id: "explore-luto-e-ressignificacao",
    name: "Luto e Ressignificação",
    imageUrl: "/images/community/explore/grief-support.png",
    description: "Um espaço seguro para falar sobre perdas, saudade e reconstrução de sentido.",
    category: "Luto",
    isPopular: true,
  },
  "mulheres-em-foco": {
    id: "explore-mulheres-em-foco",
    name: "Mulheres em Foco",
    imageUrl: "/images/community/explore/anxiety-support.png",
    description:
      "Conversas sobre saúde mental de mulheres, autoestima, carreira, família e rede de apoio.",
    category: "Mulheres",
    isPopular: true,
  },
  "relacionamentos-com-proposito": {
    id: "explore-relacionamentos-com-proposito",
    name: "Relacionamentos com Propósito",
    imageUrl: "/images/community/explore/relationships-purpose.png",
    description:
      "Reflexões sobre vínculos, comunicação, limites saudáveis e relações mais conscientes.",
    category: "Relacionamentos",
    isPopular: true,
  },
};

const fallbackImageByIndex = [
  "/images/community/explore/anxiety-support.png",
  "/images/community/explore/relationships-purpose.png",
  "/images/community/explore/grief-support.png",
  DEFAULT_COMMUNITY_IMAGE,
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

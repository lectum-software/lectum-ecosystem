import prisma from "@/infra/database/prisma";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  IPsychologistAnalyticsIndexDTO,
  PsychologistAnalyticsMetric,
  PsychologistAnalyticsPeriod,
  PsychologistAnalyticsResponse,
  PsychologistAnalyticsUnavailableMetric,
} from "../DTOs/IAnalyticsDTO";
import type { IPsychologistAnalyticsRepository } from "./interfaces/IAnalyticsRepository";

const unavailableProfileViews: PsychologistAnalyticsUnavailableMetric = {
  id: "profile_views",
  label: "Visualizações de perfil",
  source: "profile_view_event",
  reason: "source_not_available",
  description:
    "Visualizações de perfil ainda não possuem evento persistido. A métrica fica ausente para evitar simulação.",
};

const toCards = (
  metrics: PsychologistAnalyticsResponse["metrics"],
): PsychologistAnalyticsMetric[] => [
  {
    id: "whatsapp_clicks",
    label: "Conversões WhatsApp",
    value: metrics.whatsapp_clicks,
    source: "contact_request",
    unit: "count",
    description: "Contatos pelo WhatsApp registrados no período selecionado.",
  },
  {
    id: "reviews_received",
    label: "Avaliações recebidas",
    value: metrics.reviews_received,
    source: "professional_review",
    unit: "count",
    description: "Avaliações públicas recebidas no período selecionado.",
  },
  {
    id: "rating_average",
    label: "Nota média",
    value: metrics.rating_average,
    source: "psychologist_profile",
    unit: "rating",
    description: "Média materializada no perfil profissional com avaliações publicadas.",
  },
  {
    id: "posts_published",
    label: "Posts publicados",
    value: metrics.posts_published,
    source: "community_post",
    unit: "count",
    description: "Publicações de comunidade feitas por você no período selecionado.",
  },
  {
    id: "post_engagement",
    label: "Engajamento em posts",
    value: metrics.post_engagement,
    source: "community_post",
    unit: "count",
    description: "Soma de votos positivos e respostas dos seus posts no período.",
  },
];

export class PsychologistAnalyticsRepository implements IPsychologistAnalyticsRepository {
  async hasProfessionalEntitlement(userId: string): Promise<boolean> {
    const profile = await prisma.psychologist_profile.findFirst({
      where: {
        user_id: userId,
        deleted: false,
        subscriptions: {
          some: activeProfessionalEntitlementWhere(),
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(profile);
  }

  async index(
    data: IPsychologistAnalyticsIndexDTO,
    period: PsychologistAnalyticsPeriod,
    hasProfessionalEntitlement: boolean,
  ): Promise<PsychologistAnalyticsResponse> {
    const userId = data.auth.id!;
    const createdAtWindow = {
      gte: period.start_at,
      lte: period.end_at,
    };

    const [whatsappClicks, reviewsReceived, profile, postsAggregate] = await Promise.all([
      prisma.contact_request.count({
        where: {
          psychologist_id: userId,
          deleted: false,
          channel: "whatsapp",
          createdAt: createdAtWindow,
        },
      }),
      prisma.professional_review.count({
        where: {
          psychologist_id: userId,
          deleted: false,
          status: "publicada",
          createdAt: createdAtWindow,
        },
      }),
      prisma.psychologist_profile.findFirst({
        where: {
          user_id: userId,
          deleted: false,
        },
        select: {
          rating_avg: true,
          rating_count: true,
        },
      }),
      prisma.community_post.aggregate({
        where: {
          author_id: userId,
          deleted: false,
          status: "publicado",
          createdAt: createdAtWindow,
        },
        _count: { _all: true },
        _sum: {
          upvotes_count: true,
          replies_count: true,
        },
      }),
    ]);

    const postUpvotes = postsAggregate._sum.upvotes_count || 0;
    const postReplies = postsAggregate._sum.replies_count || 0;
    const metrics = {
      whatsapp_clicks: whatsappClicks,
      reviews_received: reviewsReceived,
      rating_average: profile?.rating_avg || 0,
      rating_count_total: profile?.rating_count || 0,
      posts_published: postsAggregate._count._all,
      post_engagement: postUpvotes + postReplies,
      post_upvotes: postUpvotes,
      post_replies: postReplies,
    };

    return {
      access: {
        has_professional_entitlement: hasProfessionalEntitlement,
        mode: hasProfessionalEntitlement ? "full" : "preview",
      },
      period,
      metrics,
      cards: toCards(metrics),
      unavailable: [unavailableProfileViews],
    };
  }
}

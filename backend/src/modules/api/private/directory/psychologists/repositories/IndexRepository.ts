import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import { crpExperienceYears } from "@/utils/professional-experience";
import {
  activeProfessionalEntitlementWhere,
  isVerifiedProfessionalEntitlement,
  verifiedProfessionalProfileWhere,
} from "@/utils/subscription-entitlement";
import { buildLectumWhatsappUrl } from "@/utils/whatsapp-contact";
import type {
  DirectoryCatalogItem,
  DirectoryPsychologistResponse,
  IIndexDTO,
} from "../DTOs/IIndexDTO";
import type { IIndexRepository } from "./interfaces/IIndexRepository";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const QUALIFIED_VIDEO_WATCH_SECONDS = 3;
const VIDEO_LEARNING_QUALIFIED_VIEWS = 30;
const DEFAULT_NEW_VIDEO_SCORE = 0.5;
const VIDEO_RETENTION_SCORE_WEIGHT = 0.85;
const VIDEO_COMPLETION_SCORE_WEIGHT = 0.15;
const WHATSAPP_CTR_SMOOTHING_EXPOSURES = 10;
const WHATSAPP_CTR_SMOOTHING_CLICKS = 0.5;
const FAVORITES_SCORE_TARGET = 20;
const REVIEW_COUNT_SCORE_TARGET = 30;
const RATING_PRIOR_COUNT = 5;
const RATING_PRIOR_SCORE = 0.8;
const RECENCY_WINDOW_DAYS = 90;
const CONTROLLED_RANDOMIZATION_RANGE = 0.08;

const rankingWeights = {
  video: 0.25,
  whatsapp: 0.25,
  favorites: 0.15,
  reviewCount: 0.12,
  weightedRating: 0.12,
  completeness: 0.07,
  recency: 0.04,
} as const;

const catalogSelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.specialtySelect;

type VideoWatchSessionForRanking = {
  psychologist_id: string;
  video_url: string | null;
  duration_seconds: number;
  watched_seconds: number;
  max_position_seconds: number;
  completed: boolean;
  milestone_100: boolean;
  last_event_at: Date;
  createdAt: Date;
};

type CountGroup = {
  psychologist_id: string;
  _count: {
    _all: number;
  };
  _max?: {
    createdAt: Date | null;
  };
};

type VideoRankingStats = {
  score: number;
  qualifiedViews: number;
  latestAt: Date | null;
};

type RankingContext = {
  favoriteCounts: Map<string, number>;
  whatsappClickCounts: Map<string, number>;
  latestActivityAt: Map<string, Date>;
  videoStats: Map<string, VideoRankingStats>;
  seedDate: string;
  now: Date;
  viewerId: string | null;
};

type RankingCandidate = {
  user_id: string;
  createdAt: Date;
  updatedAt: Date;
  headline: string | null;
  bio: string | null;
  cover_image_url: string | null;
  video_url: string | null;
  cpf: string | null;
  crp: string | null;
  gender: string | null;
  target_audience: Prisma.JsonValue | null;
  academic_title: string | null;
  academic_institution: string | null;
  academic_graduation_year: string | null;
  academic_formations: Prisma.JsonValue | null;
  available_days: Prisma.JsonValue | null;
  professional_address_city: string | null;
  professional_address_state: string | null;
  whatsapp: string | null;
  languages: Prisma.JsonValue | null;
  modality: string | null;
  rating_avg: number;
  rating_count: number;
  cfp_verified_at: Date | null;
  subscriptions: { id: string; source?: string | null }[];
  user: {
    id: string;
    avatar: string | null;
    psychologist_specialties: unknown[];
    psychologist_services: unknown[];
    psychologist_approaches: unknown[];
  };
};

const isCatalogItem = (value: DirectoryCatalogItem | null): value is DirectoryCatalogItem => {
  return Boolean(value?.id && value.name && value.slug);
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === "string");
};

const normalizeLanguages = (value: unknown): string[] => {
  const languages = normalizeStringArray(value);

  return languages.length > 0 ? languages : ["Português"];
};

const currentWeekdayValue = () => {
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  }).format(new Date());

  const normalized = weekday
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  if (normalized.includes("segunda")) return "segunda";
  if (normalized.includes("terca")) return "terca";
  if (normalized.includes("quarta")) return "quarta";
  if (normalized.includes("quinta")) return "quinta";
  if (normalized.includes("sexta")) return "sexta";
  if (normalized.includes("sabado")) return "sabado";
  return "domingo";
};

const hasAvailableToday = (value: unknown) => {
  return normalizeStringArray(value).includes(currentWeekdayValue());
};

const buildWhatsappUrl = (value?: string | null, psychologistName?: string | null) =>
  buildLectumWhatsappUrl({ phone: value, psychologistName, source: "profile" });

const clampScore = (value: number) => {
  if (!Number.isFinite(value)) return 0;

  return Math.min(1, Math.max(0, value));
};

const hasText = (value?: string | null) => Boolean(value?.trim());

const hasJsonItems = (value: Prisma.JsonValue | null) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;

  return false;
};

const scoreByTarget = (value: number, target: number) => {
  if (value <= 0) return 0;

  return clampScore(1 - Math.exp(-value / target));
};

const hashToUnit = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
};

const isQualifiedVideoView = (session: VideoWatchSessionForRanking) =>
  session.watched_seconds >= QUALIFIED_VIDEO_WATCH_SECONDS ||
  session.max_position_seconds >= QUALIFIED_VIDEO_WATCH_SECONDS;

const calculateSingleVideoScore = (sessions: VideoWatchSessionForRanking[]) => {
  const views = sessions.length;

  if (views === 0) {
    return {
      score: 0,
      qualifiedViews: 0,
      latestAt: null as Date | null,
    };
  }

  const durationSeconds = sessions.reduce(
    (max, session) => Math.max(max, session.duration_seconds),
    0,
  );
  const totalWatchedSeconds = sessions.reduce((sum, session) => sum + session.watched_seconds, 0);
  const completedViews = sessions.filter((session) => {
    if (session.completed || session.milestone_100) return true;
    if (durationSeconds <= 0) return false;

    return session.max_position_seconds / durationSeconds >= 0.98;
  }).length;
  const averageWatchedSeconds = totalWatchedSeconds / views;
  const retentionScore =
    durationSeconds > 0 ? clampScore(averageWatchedSeconds / durationSeconds) : 0;
  const completionScore = views > 0 ? completedViews / views : 0;
  const latestAt = sessions.reduce<Date | null>((latest, session) => {
    if (!latest || session.last_event_at > latest) return session.last_event_at;

    return latest;
  }, null);

  return {
    score: clampScore(
      retentionScore * VIDEO_RETENTION_SCORE_WEIGHT +
        completionScore * VIDEO_COMPLETION_SCORE_WEIGHT,
    ),
    qualifiedViews: sessions.filter(isQualifiedVideoView).length,
    latestAt,
  };
};

const calculateVideoScoreWithLearningWindow = (
  currentVideoUrl: string | null,
  sessions: VideoWatchSessionForRanking[],
) => {
  const currentSessions = currentVideoUrl
    ? sessions.filter((session) => session.video_url === currentVideoUrl)
    : [];
  const historicalSessions = currentVideoUrl
    ? sessions.filter((session) => session.video_url !== currentVideoUrl)
    : sessions;
  const current = calculateSingleVideoScore(currentSessions);
  const historical = calculateSingleVideoScore(historicalSessions);
  const baseline = historical.qualifiedViews > 0 ? historical.score : DEFAULT_NEW_VIDEO_SCORE;
  const confidence = clampScore(current.qualifiedViews / VIDEO_LEARNING_QUALIFIED_VIEWS);
  const currentSignal = current.qualifiedViews > 0 ? current.score : baseline;

  return {
    score: clampScore(baseline * (1 - confidence) + currentSignal * confidence),
    qualifiedViews: current.qualifiedViews + historical.qualifiedViews,
    latestAt: current.latestAt ?? historical.latestAt,
  };
};

const calculateWhatsappConversionScore = (clicks: number, qualifiedViews: number) => {
  const denominator = Math.max(qualifiedViews, clicks, 0) + WHATSAPP_CTR_SMOOTHING_EXPOSURES;
  const numerator = clicks + WHATSAPP_CTR_SMOOTHING_CLICKS;

  return clampScore(numerator / denominator);
};

const calculateWeightedRatingScore = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0 || ratingAvg <= 0) return 0;

  const normalizedRating = clampScore(ratingAvg / 500);

  return clampScore(
    (normalizedRating * ratingCount + RATING_PRIOR_SCORE * RATING_PRIOR_COUNT) /
      (ratingCount + RATING_PRIOR_COUNT),
  );
};

const calculateCompletenessScore = (candidate: RankingCandidate) => {
  const checks = [
    hasText(candidate.user.avatar),
    hasText(candidate.cover_image_url),
    hasText(candidate.headline),
    hasText(candidate.bio),
    hasText(candidate.video_url),
    hasText(candidate.whatsapp),
    hasJsonItems(candidate.languages),
    hasText(candidate.modality),
    hasText(candidate.gender),
    hasText(candidate.cpf),
    hasText(candidate.crp),
    hasText(candidate.professional_address_city) && hasText(candidate.professional_address_state),
    hasJsonItems(candidate.target_audience),
    hasText(candidate.academic_title) ||
      hasText(candidate.academic_institution) ||
      hasText(candidate.academic_graduation_year) ||
      hasJsonItems(candidate.academic_formations),
    candidate.user.psychologist_specialties.length > 0,
    candidate.user.psychologist_services.length > 0,
    candidate.user.psychologist_approaches.length > 0,
    hasJsonItems(candidate.available_days),
  ];

  return checks.filter(Boolean).length / checks.length;
};

const calculateRecencyScore = (latestActivityAt: Date | null, now: Date) => {
  if (!latestActivityAt) return 0;

  const daysSinceActivity = Math.max(0, (now.getTime() - latestActivityAt.getTime()) / MS_PER_DAY);

  return clampScore(1 - daysSinceActivity / RECENCY_WINDOW_DAYS);
};

const pickLatestDate = (...dates: Array<Date | null | undefined>) =>
  dates.reduce<Date | null>((latest, date) => {
    if (!date) return latest;
    if (!latest || date > latest) return date;

    return latest;
  }, null);

const mergeLatestActivity = (
  map: Map<string, Date>,
  psychologistId: string,
  date: Date | null | undefined,
) => {
  if (!date) return;

  const current = map.get(psychologistId);
  if (!current || date > current) {
    map.set(psychologistId, date);
  }
};

const mapGroupCounts = (groups: CountGroup[]) =>
  new Map(groups.map((group) => [group.psychologist_id, group._count._all]));

const calculateRanking = (candidate: RankingCandidate, context: RankingContext) => {
  const psychologistId = candidate.user.id;
  const isVerified = isVerifiedProfessionalEntitlement(candidate);
  const videoStats = context.videoStats.get(psychologistId) ?? {
    score: DEFAULT_NEW_VIDEO_SCORE,
    qualifiedViews: 0,
    latestAt: null,
  };
  const favoriteCount = context.favoriteCounts.get(psychologistId) ?? 0;
  const whatsappClicks = context.whatsappClickCounts.get(psychologistId) ?? 0;
  const baseScore =
    videoStats.score * rankingWeights.video +
    calculateWhatsappConversionScore(whatsappClicks, videoStats.qualifiedViews) *
      rankingWeights.whatsapp +
    scoreByTarget(favoriteCount, FAVORITES_SCORE_TARGET) * rankingWeights.favorites +
    scoreByTarget(candidate.rating_count, REVIEW_COUNT_SCORE_TARGET) * rankingWeights.reviewCount +
    calculateWeightedRatingScore(candidate.rating_avg, candidate.rating_count) *
      rankingWeights.weightedRating +
    calculateCompletenessScore(candidate) * rankingWeights.completeness +
    calculateRecencyScore(
      pickLatestDate(
        candidate.updatedAt,
        context.latestActivityAt.get(psychologistId),
        videoStats.latestAt,
      ),
      context.now,
    ) *
      rankingWeights.recency;
  const randomUnit = hashToUnit(
    `${context.seedDate}:${context.viewerId ?? "anonymous"}:${psychologistId}`,
  );
  const multiplier = 1 + (randomUnit - 0.5) * CONTROLLED_RANDOMIZATION_RANGE;

  return {
    isVerified,
    baseScore: clampScore(baseScore),
    score: clampScore(baseScore * multiplier),
  };
};

const normalizePagination = (query: IIndexDTO["q"]) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const moreExperiencedCutoffDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 10);

  return date;
};

const buildModalityWhere = (
  value?: string | null,
): Prisma.psychologist_profileWhereInput["modality"] => {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) return { not: null };

  if (normalized === "online") return { in: ["online", "hibrido"] };
  if (normalized === "presencial") return { in: ["presencial", "hibrido"] };
  if (normalized === "hibrido") return "hibrido";

  return "__invalid_modality_filter__";
};

export class IndexRepository implements IIndexRepository {
  readonly repository: ORM["psychologist_profile"];

  constructor() {
    this.repository = prisma.psychologist_profile;
  }

  async index(props: IIndexDTO): Promise<DirectoryPsychologistResponse> {
    const pagination = normalizePagination(props.q);
    const search = props.q.search?.trim();
    const viewerId = props.auth?.id;
    const viewerRelationWhere = viewerId
      ? {
          user_id: viewerId,
          deleted: false,
        }
      : {
          id: "__anonymous__",
        };

    const whereConditions: Prisma.psychologist_profileWhereInput = {
      deleted: false,
      published: true,
      video_url: {
        not: null,
      },
      modality: buildModalityWhere(props.q.modality),
      gender: props.q.gender || { not: null },
      cpf: { not: null },
      crp: { not: null },
      NOT: [
        {
          video_url: "",
        },
        {
          modality: "",
        },
        {
          gender: "",
        },
        {
          cpf: "",
        },
        {
          crp: "",
        },
        {
          professional_address_city: "",
        },
        {
          professional_address_state: "",
        },
      ],
      crp_registration_date: props.q.more_experienced
        ? {
            lt: moreExperiencedCutoffDate(),
          }
        : undefined,
      show_experience_tag: props.q.more_experienced ? true : undefined,
      available_days: props.q.available_today
        ? {
            array_contains: [currentWeekdayValue()],
          }
        : undefined,
      target_audience: props.q.target_audience
        ? {
            array_contains: [props.q.target_audience],
          }
        : { not: [] },
      professional_address_state: props.q.state
        ? {
            equals: props.q.state,
            mode: "insensitive",
          }
        : { not: null },
      professional_address_city: props.q.city
        ? {
            equals: props.q.city,
            mode: "insensitive",
          }
        : { not: null },
      race_color: props.q.race_color || undefined,
      religion: props.q.religion || undefined,
      languages: props.q.language
        ? {
            array_contains: [props.q.language],
          }
        : undefined,
      discount_first_session: props.q.discount_first_session ? true : undefined,
      accepts_insurance: props.q.accepts_insurance ? true : undefined,
      social_value: props.q.social_value ? true : undefined,
      AND: props.q.verified ? [verifiedProfessionalProfileWhere()] : undefined,
      user: {
        active: true,
        deleted: false,
        psychologist_specialties: {
          some: {
            deleted: false,
            specialty: {
              slug: props.q.specialty || undefined,
              active: true,
              deleted: false,
            },
          },
        },
        psychologist_services: {
          some: {
            deleted: false,
            service: {
              slug: props.q.service || undefined,
              active: true,
              deleted: false,
            },
          },
        },
        psychologist_approaches: {
          some: {
            deleted: false,
            approach: {
              slug: props.q.approach || undefined,
              active: true,
              deleted: false,
            },
          },
        },
      },
      OR: search
        ? [
            {
              user: {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              headline: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              bio: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              crp: {
                contains: search,
                mode: "insensitive",
              },
            },
          ]
        : undefined,
    };

    const [candidates, count, filters] = await Promise.all([
      this.repository.findMany({
        where: whereConditions,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          user_id: true,
          createdAt: true,
          updatedAt: true,
          headline: true,
          bio: true,
          cover_image_url: true,
          video_url: true,
          video_cover_url: true,
          crp: true,
          cpf: true,
          crp_registration_date: true,
          cfp_verified_at: true,
          gender: true,
          target_audience: true,
          discount_first_session: true,
          social_value: true,
          accepts_insurance: true,
          show_experience_tag: true,
          academic_title: true,
          academic_institution: true,
          academic_graduation_year: true,
          academic_formations: true,
          available_days: true,
          professional_address_city: true,
          professional_address_state: true,
          modality: true,
          languages: true,
          rating_avg: true,
          rating_count: true,
          whatsapp: true,
          subscriptions: {
            where: activeProfessionalEntitlementWhere(),
            select: {
              id: true,
              source: true,
            },
            take: 1,
          },
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              favorited_by_patients: {
                where: viewerRelationWhere,
                select: {
                  id: true,
                },
                take: 1,
              },
              followed_by_patients: {
                where: viewerRelationWhere,
                select: {
                  id: true,
                },
                take: 1,
              },
              psychologist_specialties: {
                where: {
                  deleted: false,
                  specialty: {
                    active: true,
                    deleted: false,
                  },
                },
                select: {
                  specialty: {
                    select: catalogSelect,
                  },
                },
              },
              psychologist_services: {
                where: {
                  deleted: false,
                  service: {
                    active: true,
                    deleted: false,
                  },
                },
                select: {
                  service: {
                    select: catalogSelect,
                  },
                },
              },
              psychologist_approaches: {
                where: {
                  deleted: false,
                  approach: {
                    active: true,
                    deleted: false,
                  },
                },
                select: {
                  approach: {
                    select: catalogSelect,
                  },
                },
              },
            },
          },
        },
      }),
      this.repository.count({
        where: whereConditions,
      }),
      this.getFilters(),
    ]);
    const rankingContext = await this.getRankingContext(
      candidates.map((item) => item.user.id),
      candidates.map((item) => ({
        psychologistId: item.user.id,
        videoUrl: item.video_url,
      })),
      viewerId ?? null,
    );
    const rankedCandidates = candidates
      .map((item) => ({
        item,
        ranking: calculateRanking(item, rankingContext),
      }))
      .sort((a, b) => {
        if (a.ranking.isVerified !== b.ranking.isVerified) {
          return Number(b.ranking.isVerified) - Number(a.ranking.isVerified);
        }

        if (b.ranking.score !== a.ranking.score) {
          return b.ranking.score - a.ranking.score;
        }

        if (b.ranking.baseScore !== a.ranking.baseScore) {
          return b.ranking.baseScore - a.ranking.baseScore;
        }

        if (b.item.rating_count !== a.item.rating_count) {
          return b.item.rating_count - a.item.rating_count;
        }

        if (b.item.rating_avg !== a.item.rating_avg) {
          return b.item.rating_avg - a.item.rating_avg;
        }

        return b.item.createdAt.getTime() - a.item.createdAt.getTime();
      })
      .slice(pagination.skip, pagination.skip + pagination.limit)
      .map(({ item }) => item);

    return {
      data: rankedCandidates.map((item) => ({
        id: item.user.id,
        name: item.user.name,
        avatar: item.user.avatar,
        headline: item.headline,
        bio: item.bio,
        video_url: item.video_url,
        video_cover_url: item.video_cover_url,
        crp: item.crp,
        gender: item.gender,
        modality: item.modality,
        languages: normalizeLanguages(item.languages),
        rating_avg: item.rating_avg,
        rating_count: item.rating_count,
        verified: isVerifiedProfessionalEntitlement(item),
        available_today: hasAvailableToday(item.available_days),
        formation_years: crpExperienceYears(item.crp_registration_date),
        discount_first_session: item.discount_first_session,
        social_value: item.social_value,
        accepts_insurance: item.accepts_insurance,
        show_experience_tag: item.show_experience_tag,
        whatsapp_url: buildWhatsappUrl(item.whatsapp, item.user.name),
        favorited: item.user.favorited_by_patients.length > 0,
        followed: item.user.followed_by_patients.length > 0,
        specialties: item.user.psychologist_specialties
          .map(({ specialty }) => specialty)
          .filter(isCatalogItem),
        services: item.user.psychologist_services
          .map(({ service }) => service)
          .filter(isCatalogItem),
        approaches: item.user.psychologist_approaches
          .map(({ approach }) => approach)
          .filter(isCatalogItem),
      })),
      filters,
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
  }

  private async getRankingContext(
    psychologistIds: string[],
    currentVideos: Array<{ psychologistId: string; videoUrl: string | null }>,
    viewerId: string | null,
  ): Promise<RankingContext> {
    const now = new Date();
    const latestActivityAt = new Map<string, Date>();

    if (psychologistIds.length === 0) {
      return {
        favoriteCounts: new Map(),
        whatsappClickCounts: new Map(),
        latestActivityAt,
        videoStats: new Map(),
        seedDate: now.toISOString().slice(0, 10),
        now,
        viewerId,
      };
    }

    const [favoriteGroups, whatsappGroups, reviewGroups, videoSessions] = await Promise.all([
      prisma.psychologist_favorite.groupBy({
        by: ["psychologist_id"],
        where: {
          psychologist_id: {
            in: psychologistIds,
          },
          deleted: false,
        },
        _count: {
          _all: true,
        },
        _max: {
          createdAt: true,
        },
      }),
      prisma.contact_request.groupBy({
        by: ["psychologist_id"],
        where: {
          psychologist_id: {
            in: psychologistIds,
          },
          deleted: false,
          channel: "whatsapp",
        },
        _count: {
          _all: true,
        },
        _max: {
          createdAt: true,
        },
      }),
      prisma.professional_review.groupBy({
        by: ["psychologist_id"],
        where: {
          psychologist_id: {
            in: psychologistIds,
          },
          deleted: false,
          status: "publicada",
        },
        _count: {
          _all: true,
        },
        _max: {
          createdAt: true,
        },
      }),
      prisma.profile_video_watch_session.findMany({
        where: {
          psychologist_id: {
            in: psychologistIds,
          },
          deleted: false,
          OR: [
            {
              watched_seconds: {
                gt: 0,
              },
            },
            {
              max_position_seconds: {
                gt: 0,
              },
            },
          ],
        },
        select: {
          psychologist_id: true,
          video_url: true,
          duration_seconds: true,
          watched_seconds: true,
          max_position_seconds: true,
          completed: true,
          milestone_100: true,
          last_event_at: true,
          createdAt: true,
        },
      }),
    ]);

    for (const group of [...favoriteGroups, ...whatsappGroups, ...reviewGroups]) {
      mergeLatestActivity(latestActivityAt, group.psychologist_id, group._max?.createdAt);
    }

    const sessionsByPsychologist = new Map<string, VideoWatchSessionForRanking[]>();

    for (const session of videoSessions) {
      const sessions = sessionsByPsychologist.get(session.psychologist_id) ?? [];
      sessions.push(session);
      sessionsByPsychologist.set(session.psychologist_id, sessions);
      mergeLatestActivity(latestActivityAt, session.psychologist_id, session.last_event_at);
    }

    const videoStats = new Map<string, VideoRankingStats>();

    for (const currentVideo of currentVideos) {
      videoStats.set(
        currentVideo.psychologistId,
        calculateVideoScoreWithLearningWindow(
          currentVideo.videoUrl,
          sessionsByPsychologist.get(currentVideo.psychologistId) ?? [],
        ),
      );
    }

    return {
      favoriteCounts: mapGroupCounts(favoriteGroups),
      whatsappClickCounts: mapGroupCounts(whatsappGroups),
      latestActivityAt,
      videoStats,
      seedDate: now.toISOString().slice(0, 10),
      now,
      viewerId,
    };
  }

  private async getFilters() {
    const [specialties, services, approaches] = await Promise.all([
      prisma.specialty.findMany({
        where: {
          active: true,
          deleted: false,
        },
        select: catalogSelect,
        orderBy: {
          name: "asc",
        },
      }),
      prisma.service.findMany({
        where: {
          active: true,
          deleted: false,
        },
        select: catalogSelect,
        orderBy: {
          name: "asc",
        },
      }),
      prisma.approach.findMany({
        where: {
          active: true,
          deleted: false,
        },
        select: catalogSelect,
        orderBy: {
          name: "asc",
        },
      }),
    ]);

    return {
      specialties,
      services,
      approaches,
    };
  }
}

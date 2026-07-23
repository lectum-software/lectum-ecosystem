import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { timeToFirstPaidSubscription } from "@/utils/admin-psychologist-analytics";
import { crpExperienceYears } from "@/utils/professional-experience";
import {
  normalizeProfessionalDisplayName,
  normalizeProfessionalNamePart,
} from "@/utils/professional-name";
import { parseStoredCrp } from "@/utils/professional-registry";
import { rankPsychologistCandidates } from "@/utils/psychologist-public-ranking";
import { buildAdminPsychologistActivityItems } from "../../activities/use-cases/services";
import type {
  AdminPsychologistCatalogItem,
  AdminPsychologistDetailDTO,
  AdminPsychologistDetailEvent,
  AdminPsychologistDetailMetric,
  AdminPsychologistDetailStatus,
  AdminPsychologistIntegrationStatus,
  IAdminPsychologistDetailDTO,
} from "../DTOs/IAdminPsychologistDetailDTO";
import {
  type AdminPsychologistDetailRecord,
  AdminPsychologistDetailRepository,
} from "../repositories/AdminPsychologistDetailRepository";

const STATUS_ACTIVE = "ativa";
const FREE_PLAN_SLUG = "gratuito";

const STATUS_LABELS: Record<AdminPsychologistDetailStatus, string> = {
  free: "Gratuito",
  pending: "Pendente",
  unpublished: "Não publicado",
  verified: "Verificado",
};

const trimOrNull = (value?: string | null) => {
  const normalized = value?.trim();

  return normalized ? normalized : null;
};

const jsonStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item).trim()).filter(Boolean);
};

const normalizeCatalogItems = <T extends { id: string; name: string; slug: string }>(
  items: T[],
): AdminPsychologistCatalogItem[] =>
  items
    .map((item) => ({ id: item.id, name: item.name, slug: item.slug }))
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));

const normalizeName = (name: string) =>
  normalizeProfessionalDisplayName(name) || name.replace(/\s+/g, " ").trim() || "Psicólogo";

const buildPersonalFullName = (profile: AdminPsychologistDetailRecord) => {
  const professionalName = [
    normalizeProfessionalNamePart(profile.professional_first_name),
    normalizeProfessionalNamePart(profile.professional_last_name),
  ]
    .filter(Boolean)
    .join(" ");

  return professionalName || normalizeProfessionalNamePart(profile.user.name) || "Psicólogo";
};

const ratingAverage = (value: number) => Math.round((value / 100) * 10) / 10;
const roundScore = (value: number) => Math.round(value * 1000) / 10;

const subscriptionActiveAt = (
  subscription: AdminPsychologistDetailRecord["subscriptions"][number],
  date: Date,
) => {
  if (subscription.status !== STATUS_ACTIVE) return false;
  if (subscription.createdAt > date) return false;

  return !subscription.current_period_end || subscription.current_period_end > date;
};

const isFreeSubscription = (subscription: AdminPsychologistDetailRecord["subscriptions"][number]) =>
  subscription.plan.slug === FREE_PLAN_SLUG;

const isProfessionalPlan = (subscription: AdminPsychologistDetailRecord["subscriptions"][number]) =>
  subscription.plan.slug !== FREE_PLAN_SLUG;

const activeSubscriptionsAt = (profile: AdminPsychologistDetailRecord, date: Date) =>
  profile.subscriptions.filter((subscription) => subscriptionActiveAt(subscription, date));

const activeProfessionalSubscriptionsAt = (profile: AdminPsychologistDetailRecord, date: Date) =>
  activeSubscriptionsAt(profile, date).filter(isProfessionalPlan);

const hasVerifiedEntitlementAt = (profile: AdminPsychologistDetailRecord, date: Date) => {
  const entitlements = activeProfessionalSubscriptionsAt(profile, date);
  if (entitlements.length === 0) return false;

  if (profile.crp_status === "aprovado") return true;
  if (profile.cfp_verified_at && profile.cfp_verified_at <= date) return true;

  return entitlements.some(
    (subscription) =>
      subscription.source === "admin_grant" &&
      (subscription.grant_started_at ?? subscription.createdAt) <= date,
  );
};

const pickCurrentPlan = (profile: AdminPsychologistDetailRecord, date: Date) => {
  const active = activeSubscriptionsAt(profile, date);
  if (active.length === 0) return null;

  return [...active].sort((left, right) => {
    const leftProfessional = Number(isProfessionalPlan(left));
    const rightProfessional = Number(isProfessionalPlan(right));
    if (leftProfessional !== rightProfessional) return rightProfessional - leftProfessional;

    return right.createdAt.getTime() - left.createdAt.getTime();
  })[0];
};

const mapStatus = (
  profile: AdminPsychologistDetailRecord,
  date: Date,
): AdminPsychologistDetailStatus => {
  if (hasVerifiedEntitlementAt(profile, date)) return "verified";
  if (!profile.published) return "unpublished";
  if (activeSubscriptionsAt(profile, date).some(isFreeSubscription)) return "free";

  return "pending";
};

const splitCrp = (crp: string | null) => {
  const { crp_number, crp_region } = parseStoredCrp(crp);

  return {
    regional_crp: trimOrNull(crp_region),
    registration_number: trimOrNull(crp_number),
  };
};

const latestSubmittedCpf = (profile: AdminPsychologistDetailRecord) =>
  trimOrNull(profile.cpf) ??
  trimOrNull(profile.registry_checks.find((check) => trimOrNull(check.cpf))?.cpf);

const fullAddress = (profile: AdminPsychologistDetailRecord) => {
  const line = [
    trimOrNull(profile.professional_address_street),
    trimOrNull(profile.professional_address_number),
    trimOrNull(profile.professional_address_complement),
  ]
    .filter(Boolean)
    .join(", ");
  const cityLine = [
    trimOrNull(profile.professional_address_district),
    trimOrNull(profile.professional_address_city),
    trimOrNull(profile.professional_address_state),
  ]
    .filter(Boolean)
    .join(" - ");

  return [line, cityLine].filter(Boolean).join("\n") || null;
};

const normalizeAcademicFormations = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (!item || typeof item !== "object") return "";

      const record = item as Record<string, unknown>;
      return [record.title, record.course, record.institution, record.year]
        .map((part) => String(part ?? "").trim())
        .filter(Boolean)
        .join(" - ");
    })
    .filter(Boolean);
};

const latestAccessAt = (profile: AdminPsychologistDetailRecord) => {
  const token = profile.user.user_tokens[0];
  if (!token) return null;

  return token.updatedAt > token.createdAt ? token.updatedAt : token.createdAt;
};

const gatewayLabel = (
  subscription: AdminPsychologistDetailRecord["subscriptions"][number] | null,
) => {
  const value = (subscription?.gateway || subscription?.source || "").toLowerCase();
  if (value.includes("mercadopago") || value.includes("mercado_pago")) return "Mercado Pago";

  return subscription?.gateway || null;
};

const subscriptionSourceDate = (
  subscription: AdminPsychologistDetailRecord["subscriptions"][number] | null,
) => subscription?.grant_started_at ?? subscription?.createdAt ?? null;

const buildSubscription = (profile: AdminPsychologistDetailRecord, date: Date) => {
  const subscription = pickCurrentPlan(profile, date);
  const paymentMethod = profile.user.payment_methods[0] ?? null;

  return {
    current_period_end: subscription?.current_period_end ?? null,
    gateway: subscription?.gateway ?? null,
    gateway_label: gatewayLabel(subscription),
    id: subscription?.id ?? null,
    interval: subscription?.plan.interval ?? null,
    payment_method: paymentMethod
      ? {
          brand: paymentMethod.brand,
          exp_month: paymentMethod.exp_month,
          exp_year: paymentMethod.exp_year,
          gateway: paymentMethod.gateway,
          last4: paymentMethod.last4,
        }
      : null,
    plan_name: subscription?.plan.name ?? null,
    plan_slug: subscription?.plan.slug ?? null,
    price_cents: subscription?.plan.price_cents ?? null,
    source: subscription?.source ?? null,
    started_at: subscriptionSourceDate(subscription),
    status: subscription?.status ?? null,
    time_to_first_paid_subscription: timeToFirstPaidSubscription({
      currentSubscription: subscription,
      registeredAt: profile.user.createdAt,
      subscriptions: profile.subscriptions,
    }),
  } satisfies AdminPsychologistDetailDTO["general"]["subscription"];
};

const buildAccountHistory = (
  profile: AdminPsychologistDetailRecord,
  subscription: AdminPsychologistDetailDTO["general"]["subscription"],
): AdminPsychologistDetailEvent[] => {
  const events: AdminPsychologistDetailEvent[] = [
    {
      created_at: profile.user.createdAt,
      description: "Cadastro administrativo criado na plataforma.",
      id: `account-created-${profile.user.id}`,
      label: "Conta criada",
      source: "user.createdAt",
      type: "account_created",
    },
    {
      created_at: profile.createdAt,
      description: "Perfil profissional criado na base Lectum.",
      id: `profile-created-${profile.id}`,
      label: "Perfil criado",
      source: "psychologist_profile.createdAt",
      type: "profile_created",
    },
  ];

  if (profile.cfp_verified_at) {
    events.push({
      created_at: profile.cfp_verified_at,
      description: "Validação de registro profissional confirmada.",
      id: `crp-verified-${profile.id}`,
      label: "Validação CRP",
      source: "psychologist_profile.cfp_verified_at",
      type: "registry_verified",
    });
  }

  if (profile.published) {
    events.push({
      created_at: profile.updatedAt,
      description: "Perfil consta como publicado na plataforma.",
      id: `profile-published-${profile.id}`,
      label: "Perfil publicado",
      source: "psychologist_profile.published + updatedAt",
      type: "profile_published",
    });
  }

  if (subscription.started_at) {
    events.push({
      created_at: subscription.started_at,
      description: `${subscription.plan_name ?? "Plano profissional"} iniciado.`,
      id: `subscription-started-${subscription.id ?? profile.id}`,
      label: "Assinatura iniciada",
      source: "professional_subscription.createdAt/grant_started_at",
      type: "subscription_started",
    });
  }

  if (profile.whatsapp_verified_at) {
    events.push({
      created_at: profile.whatsapp_verified_at,
      description: "Número de WhatsApp confirmado para o perfil profissional.",
      id: `whatsapp-verified-${profile.id}`,
      label: "WhatsApp verificado",
      source: "psychologist_profile.whatsapp_verified_at",
      type: "whatsapp_verified",
    });
  }

  const lastAccess = latestAccessAt(profile);
  if (lastAccess) {
    events.push({
      created_at: lastAccess,
      description: "Última sessão registrada para a conta.",
      id: `last-access-${profile.user.id}`,
      label: "Último acesso",
      source: "user_token.updatedAt",
      type: "last_access",
    });
  }

  return events.sort((left, right) => left.created_at.getTime() - right.created_at.getTime());
};

const buildIntegrations = (
  profile: AdminPsychologistDetailRecord,
  subscription: AdminPsychologistDetailDTO["general"]["subscription"],
): AdminPsychologistIntegrationStatus[] => {
  const registryCheck = profile.registry_checks[0] ?? null;
  const hasSubscription = Boolean(subscription.id && subscription.status === STATUS_ACTIVE);
  const hasManualActivation = hasSubscription && subscription.source === "admin_grant";
  const hasMercadoPago = Boolean(
    subscription.gateway_label === "Mercado Pago" ||
      subscription.payment_method?.gateway === "mercadopago",
  );

  return [
    {
      checked_at: hasManualActivation
        ? subscription.started_at
        : (profile.cfp_verified_at ?? registryCheck?.checked_at ?? null),
      id: "registry",
      label: "Verificação profissional",
      source: hasManualActivation
        ? "admin_grant"
        : profile.cfp_verified_at
          ? "api_automatica"
          : "professional_registry_check",
      status:
        profile.crp_status === "aprovado" || hasManualActivation
          ? "active"
          : registryCheck
            ? "pending"
            : "missing",
      status_label: hasManualActivation
        ? "Ativado manualmente"
        : profile.crp_status === "aprovado"
          ? "Aprovado"
          : registryCheck
            ? "Em análise"
            : "Sem validação",
    },
    {
      checked_at: subscription.started_at,
      id: "subscription",
      label: "Assinatura",
      source: "professional_subscription",
      status: hasSubscription ? "active" : "missing",
      status_label: hasSubscription ? "Ativa" : "Sem assinatura ativa",
    },
    {
      checked_at: profile.whatsapp_verified_at,
      id: "whatsapp",
      label: "WhatsApp",
      source: "psychologist_profile.whatsapp/whatsapp_verified_at",
      status: profile.whatsapp_verified_at ? "active" : profile.whatsapp ? "configured" : "missing",
      status_label: profile.whatsapp_verified_at
        ? "Verificado"
        : profile.whatsapp
          ? "Configurado"
          : "Não configurado",
    },
    {
      checked_at: subscription.started_at,
      id: "mercado_pago",
      label: "Mercado Pago",
      source: "professional_subscription.gateway/payment_method.gateway",
      status: hasMercadoPago ? "synced" : "unavailable",
      status_label: hasMercadoPago ? "Sincronizado" : "Sem vínculo ativo",
    },
    {
      checked_at: profile.user.confirmed_date,
      id: "email",
      label: "E-mail",
      source: "user.confirmed/confirmed_date",
      status: profile.user.confirmed ? "active" : "pending",
      status_label: profile.user.confirmed ? "Confirmado" : "Pendente",
    },
  ];
};

const buildMetrics = (input: {
  favorites: number;
  profileViews: number;
  profile: AdminPsychologistDetailRecord;
  ranking: { position: number; score: number } | null;
  whatsappClicks: number;
}): AdminPsychologistDetailMetric[] => [
  {
    id: "rating_avg",
    label: "Avaliação média",
    source: "psychologist_profile.rating_avg/rating_count",
    unit: "decimal",
    value: ratingAverage(input.profile.rating_avg),
  },
  {
    id: "favorites",
    label: "Favoritados",
    source: "psychologist_favorite",
    unit: "count",
    value: input.favorites,
  },
  {
    id: "whatsapp_clicks",
    label: "Cliques no WhatsApp",
    source: "contact_request.channel=whatsapp",
    unit: "count",
    value: input.whatsappClicks,
  },
  {
    id: "ranking",
    label: "Ranking público",
    source: "shared_psychologist_public_ranking_helper",
    unit: "position",
    value: input.ranking?.position ?? null,
  },
  {
    id: "profile_views",
    label: "Visualizações de perfil",
    source: "profile_view_event",
    unit: "count",
    value: input.profileViews,
  },
];

const buildDetail = async (
  profile: AdminPsychologistDetailRecord,
  repository: AdminPsychologistDetailRepository,
): Promise<AdminPsychologistDetailDTO> => {
  const now = new Date();
  const userId = profile.user.id;
  const currentSubscription = buildSubscription(profile, now);
  const [favorites, whatsappClicks, profileViews, rankingCandidates, activityFeed] =
    await Promise.all([
      repository.countFavorites(userId),
      repository.countWhatsappClicks(userId),
      repository.countProfileViews(userId),
      repository.listPublicRankingCandidates(),
      buildAdminPsychologistActivityItems({ id: profile.id }),
    ]);

  const ranked = await rankPsychologistCandidates(rankingCandidates, null);
  const rankIndex = ranked.findIndex(({ item }) => item.user.id === userId);
  const isListedInPublicDirectory = rankIndex >= 0;
  const ranking = isListedInPublicDirectory
    ? {
        position: rankIndex + 1,
        score: roundScore(ranked[rankIndex].ranking.score),
      }
    : null;
  const status = mapStatus(profile, now);
  const { regional_crp, registration_number } = splitCrp(profile.crp);
  const accountHistory = buildAccountHistory(profile, currentSubscription);
  const recentActivity: AdminPsychologistDetailEvent[] = (activityFeed?.activities ?? [])
    .slice(0, 6)
    .map((activity) => ({
      actor: activity.actor,
      created_at: activity.occurred_at,
      description: activity.description,
      id: activity.id,
      label: activity.type.label,
      source: activity.source,
      type: activity.type.id,
    }));

  return {
    general: {
      account_history: accountHistory,
      integrations: buildIntegrations(profile, currentSubscription),
      metrics: buildMetrics({
        favorites,
        profile,
        profileViews,
        ranking,
        whatsappClicks,
      }),
      recent_activity: recentActivity,
      subscription: currentSubscription,
    },
    header: {
      active: isListedInPublicDirectory,
      avatar: profile.user.avatar,
      created_at: profile.user.createdAt,
      crp: profile.crp,
      id: userId,
      last_access_at: latestAccessAt(profile),
      name: normalizeName(profile.user.name),
      plan_name: currentSubscription.plan_name,
      plan_slug: currentSubscription.plan_slug,
      public_profile_url: `/psychologists/${userId}`,
      published: profile.published,
      rating_avg: ratingAverage(profile.rating_avg),
      rating_count: profile.rating_count,
      status,
      status_label: STATUS_LABELS[status],
      verified: status === "verified",
    },
    profile: {
      academic: {
        formations: normalizeAcademicFormations(profile.academic_formations),
        graduation_year: trimOrNull(profile.academic_graduation_year),
        institution: trimOrNull(profile.academic_institution),
        title: trimOrNull(profile.academic_title),
      },
      content: {
        bio: trimOrNull(profile.bio),
        cover_image_url: trimOrNull(profile.cover_image_url),
        headline: trimOrNull(profile.headline),
        video_cover_url: trimOrNull(profile.video_cover_url),
        video_url: trimOrNull(profile.video_url),
      },
      features: {
        accepts_insurance: profile.accepts_insurance,
        discount_first_session: profile.discount_first_session,
        social_value: profile.social_value,
      },
      personal: {
        address: {
          city: trimOrNull(profile.professional_address_city),
          complement: trimOrNull(profile.professional_address_complement),
          district: trimOrNull(profile.professional_address_district),
          full: fullAddress(profile),
          number: trimOrNull(profile.professional_address_number),
          state: trimOrNull(profile.professional_address_state),
          street: trimOrNull(profile.professional_address_street),
          zip: trimOrNull(profile.professional_address_zip),
        },
        birthdate: profile.birthdate,
        cpf: latestSubmittedCpf(profile),
        email: profile.user.email,
        full_name: buildPersonalFullName(profile),
        phone: trimOrNull(profile.whatsapp),
        provider: profile.user.provider,
      },
      professional: {
        approaches: normalizeCatalogItems(
          profile.user.psychologist_approaches.map(({ approach }) => approach),
        ),
        crp: trimOrNull(profile.crp),
        crp_registration_date: profile.crp_registration_date,
        crp_status: profile.crp_status,
        experience_years: crpExperienceYears(profile.crp_registration_date),
        gender: trimOrNull(profile.gender),
        languages: jsonStringArray(profile.languages),
        modality: trimOrNull(profile.modality),
        race_color: trimOrNull(profile.race_color),
        regional_crp,
        registration_number,
        religion: trimOrNull(profile.religion),
        services: normalizeCatalogItems(
          profile.user.psychologist_services.map(({ service }) => service),
        ),
        specialties: normalizeCatalogItems(
          profile.user.psychologist_specialties.map(({ specialty }) => specialty),
        ),
        target_audience: jsonStringArray(profile.target_audience),
      },
    },
    source: "user+psychologist_profile+catalogs+subscriptions+metrics+events",
  };
};

const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "psychologist" }),
});

export const showAdminPsychologist = async (
  data: IAdminPsychologistDetailDTO,
): Promise<Resolve> => {
  const repository = new AdminPsychologistDetailRepository();
  const profile = await repository.findPsychologist(data.p.id);
  if (!profile) return notFound();

  return {
    status: 200,
    ...msg("index", {}),
    data: await buildDetail(profile, repository),
  };
};

export default async (data: IAdminPsychologistDetailDTO): Promise<Resolve> => {
  return showAdminPsychologist(data);
};

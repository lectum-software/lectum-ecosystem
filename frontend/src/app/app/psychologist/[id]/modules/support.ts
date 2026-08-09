import { BadgePercent, type BriefcaseBusiness, HeartHandshake, ShieldCheck } from "lucide-react";
import { getSafeApiErrorMessage } from "@/api/errors";
import type {
  DirectoryPsychologistParticipationSummary,
  DirectoryPsychologistProfile,
  DirectoryPsychologistProfilePost,
  DirectoryPsychologistProfileReview,
} from "@/api/generator/types/directory";
import type { PostListPost } from "@/api/generator/types/posts";
import type { DisplayMode } from "@/api/req/analytics";
import { getCurrentAnalyticsPath } from "@/utils/analytics-path";
import { formatCrpNumber } from "@/utils/crp";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";

export const PAGE_LIMIT = 5;

export const PROFILE_TABS = ["geral", "publicacoes", "avaliacoes"] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

export type ProfileTabHistoryMode = "push" | "replace";

export type ProfileTabNavigationOptions = {
  history?: ProfileTabHistoryMode;
  scrollToContentTop?: boolean;
};

export type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

export type ApiError = Error & {
  data?: ApiErrorData;
};

export type NavigatorWithStandalone = Navigator & { standalone?: boolean };

export const getDisplayMode = (): DisplayMode => {
  if (typeof window === "undefined") return "unknown";

  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return "fullscreen";
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return "minimal-ui";
  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  ) {
    return "standalone";
  }
  if (window.matchMedia("(display-mode: browser)").matches) return "browser";

  return "unknown";
};

export const currentAnalyticsPath = getCurrentAnalyticsPath;

export const tabs: Array<{ label: string; value: ProfileTab }> = [
  { label: "Geral", value: "geral" },
  { label: "Publicações", value: "publicacoes" },
  { label: "Avaliações", value: "avaliacoes" },
];

export const PROFILE_CARD_SURFACE =
  "box-border rounded-[26px] border border-border bg-surface shadow-lectum-soft dark:border-border dark:bg-surface";

export const PROFILE_SUBTLE_SURFACE =
  "box-border rounded-[18px] border border-border bg-surface/88";

export const EMPTY_PUBLICATIONS_SUMMARY: DirectoryPsychologistParticipationSummary = {
  posts_count: 0,
  replies_count: 0,
  top_mentor_communities: [],
};

export const PROFILE_ABOUT_MAX_LINES = 3;

export const PROFILE_ABOUT_MORE_LABEL = "... ver mais";

export const PROFILE_ABOUT_LESS_LABEL = "ver menos";

export const PSYCHOLOGIST_DEFAULT_COVER_BACKGROUND = [
  "radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--lectum-surface) 92%, transparent) 0%, color-mix(in srgb, var(--lectum-surface) 38%, transparent) 24%, transparent 48%)",
  "radial-gradient(circle at 82% 20%, color-mix(in srgb, var(--lectum-primary) 34%, transparent) 0%, color-mix(in srgb, var(--lectum-primary) 8%, transparent) 28%, transparent 46%)",
  "radial-gradient(circle at 58% 104%, color-mix(in srgb, var(--lectum-primary-hover) 28%, transparent) 0%, color-mix(in srgb, var(--lectum-primary-hover) 8%, transparent) 34%, transparent 58%)",
  "linear-gradient(135deg, var(--lectum-surface-muted) 0%, var(--lectum-primary-soft) 44%, color-mix(in srgb, var(--lectum-primary) 42%, var(--lectum-primary-soft)) 100%)",
].join(", ");

export const modalityLabel: Record<string, string> = {
  online: "Online",
  presencial: "Presencial",
  hibrido: "Online e presencial",
};

export const languageLabel: Record<string, string> = {
  pt: "Português",
  "pt-br": "Português",
  en: "Inglês",
  es: "Espanhol",
  fr: "Francês",
};

export const targetAudienceLabel: Record<string, string> = {
  adolescentes: "Adolescentes",
  adultos: "Adultos",
  criancas: "Crianças",
  idosos: "Idosos",
  casais: "Casais",
  familias: "Famílias",
  lgbtqia_plus: "LGBTQIA+",
};

export const normalizeTab = (value: string | null): ProfileTab => {
  if (value === "sobre") return "geral";

  return PROFILE_TABS.includes(value as ProfileTab) ? (value as ProfileTab) : "geral";
};

export const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const formatHeroRating = (ratingAvg: number) => {
  return (ratingAvg / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};

export const formatExperienceLabel = (years?: number | null) => {
  if (!years || years <= 0) return null;

  return `${years} ${years === 1 ? "ano" : "anos"} de experiência`;
};

export const getPsychologistTitle = (gender?: string | null) => {
  const normalized = gender?.toLowerCase();

  return normalized === "feminino" ? "Psicóloga" : "Psicólogo";
};

export const getPsychologistDisplayName = (profile: DirectoryPsychologistProfile) =>
  normalizeProfessionalDisplayName(profile.name);

export const formatRatingNumber = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "0,0";

  return (ratingAvg / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};

export const formatDate = (value: string | null) => {
  if (!value) return "Data não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

export const toPsychologistWhatsAppIdentity = (profile: DirectoryPsychologistProfile) => ({
  avatar: profile.avatar,
  crp: profile.crp ? formatCrpNumber(profile.crp) : null,
  id: profile.id,
  name: getPsychologistDisplayName(profile) || profile.name,
  typeLabel: getPsychologistTitle(profile.gender),
  whatsappName: profile.whatsapp_name,
  whatsappUrl: profile.whatsapp_url,
});

export const scrollProfileContentIntoView = () => {
  if (typeof window === "undefined") return;

  const contentNode = document.getElementById("profile-content");

  if (!contentNode) return;

  const headerOffset = window.innerWidth < 1024 ? 88 : 0;
  const top = Math.max(0, contentNode.getBoundingClientRect().top + window.scrollY - headerOffset);

  window.scrollTo({ behavior: "smooth", top });
};

export const translateLanguage = (language: string) => {
  const normalized = language.toLowerCase();

  return languageLabel[normalized] || language;
};

export const translateTargetAudience = (target: string) => {
  return targetAudienceLabel[target] || target;
};

export const buildBenefitTags = (profile: DirectoryPsychologistProfile) => {
  const tags: Array<{
    icon: typeof BriefcaseBusiness;
    label: string;
  }> = [];

  if (profile.accepts_insurance) {
    tags.push({ icon: ShieldCheck, label: "Aceita convênios" });
  }

  if (profile.social_value) {
    tags.push({ icon: HeartHandshake, label: "Valor social" });
  }

  if (profile.discount_first_session) {
    tags.push({ icon: BadgePercent, label: "Desconto 1ª sessão" });
  }

  return tags;
};

export const hasInPersonCare = (modality?: string | null) => {
  const normalized = modality?.toLowerCase() || "";

  return (
    normalized === "presencial" || normalized === "hibrido" || normalized.includes("presencial")
  );
};

export const formatAttendanceLabel = (profile: DirectoryPsychologistProfile) => {
  if (hasInPersonCare(profile.modality)) {
    const city = profile.address_city?.trim();
    const state = profile.address_state?.trim().toUpperCase();

    if (city && state) return `Online e Presencial em ${city}/${state}`;
    if (city) return `Online e Presencial em ${city}`;

    return "Online e Presencial";
  }

  if (!profile.modality) return "Modalidade não informada";

  return modalityLabel[profile.modality] || profile.modality;
};

export const resolveErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as ApiError;
  const rawMessage = getSafeApiErrorMessage(error, "");
  const normalized = rawMessage.toLowerCase();

  if (apiError?.data?.status === 404 || normalized.includes("não encontrado")) {
    return "Este perfil não está publicado ou não está disponível para visualização.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar este perfil.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar ao serviço agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || fallback;
};

export const formatList = (items: string[], empty = "Não informado") => {
  const visibleItems = items.map((item) => item.trim()).filter(Boolean);

  return visibleItems.length > 0 ? visibleItems.join(", ") : empty;
};

export const flattenProfilePublicationPages = (
  pages?: Array<{ data: DirectoryPsychologistProfilePost[] }>,
) => {
  const seen = new Set<string>();
  const posts: DirectoryPsychologistProfilePost[] = [];

  for (const page of pages ?? []) {
    for (const post of page.data) {
      const key = `${post.contribution_type}-${post.id}-${post.highlighted_professional_reply?.id ?? "post"}`;
      if (seen.has(key)) continue;

      seen.add(key);
      posts.push(post);
    }
  }

  return posts;
};

export const getProfilePublicationReplyId = (post: PostListPost) => {
  const profilePublication = post as DirectoryPsychologistProfilePost;

  if (profilePublication.contribution_type !== "reply") return null;

  return profilePublication.highlighted_professional_reply?.id ?? null;
};

export const profilePublicationHref = (post: PostListPost) => {
  const baseHref = `/comunidades/${post.community.slug}/publicacao/${post.id}`;
  const replyId = getProfilePublicationReplyId(post);

  if (!replyId) return baseHref;

  return `${baseHref}?focusReplyId=${encodeURIComponent(replyId)}#reply-${replyId}`;
};

export const flattenProfileReviewPages = (
  pages?: Array<{ data: DirectoryPsychologistProfileReview[] }>,
) => {
  const seen = new Set<string>();
  const reviews: DirectoryPsychologistProfileReview[] = [];

  for (const page of pages ?? []) {
    for (const review of page.data) {
      if (seen.has(review.id)) continue;

      seen.add(review.id);
      reviews.push(review);
    }
  }

  return reviews;
};

export const hashVideoSessionStorageKey = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
};

export const createVideoSessionKey = (profileId: string, videoUrl: string) => {
  const storageKey = `lectum:presentation-video-session:${profileId}:${hashVideoSessionStorageKey(videoUrl)}`;

  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored) return stored;

    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    window.sessionStorage.setItem(storageKey, generated);

    return generated;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

export const PRESENTATION_VIDEO_RETENTION_BUCKETS = Array.from(
  { length: 20 },
  (_, index) => (index + 1) * 5,
);

export const formatPublicationMetric = (value: number) => value.toLocaleString("pt-BR");

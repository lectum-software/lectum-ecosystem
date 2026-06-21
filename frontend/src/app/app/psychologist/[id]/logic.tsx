"use client";

import {
  ArrowLeft,
  BadgePercent,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  CornerUpLeft,
  FileText,
  GraduationCap,
  Heart,
  HeartHandshake,
  Languages,
  type LucideIcon,
  MapPin,
  MessageSquareText,
  PencilLine,
  Share2,
  ShieldCheck,
  Star,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useDirectoryPsychologist,
  useDirectoryPsychologistPosts,
  useDirectoryPsychologistReviews,
  useDirectoryPsychologistVideoWatch,
} from "@/api/callers/directory";
import { usePatient } from "@/api/callers/patient";
import { usePsychologistFreeProfile } from "@/api/callers/psychologist-free-profile";
import type {
  DirectoryCatalogItem,
  DirectoryPsychologistParticipationSummary,
  DirectoryPsychologistProfile,
  DirectoryPsychologistProfilePost,
  DirectoryPsychologistProfileReview,
  DirectoryPsychologistTopMentorCommunity,
  DirectoryPsychologistVideoWatchPayload,
  DirectoryReviewSummary,
} from "@/api/generator/types/directory";
import type { FreeProfessionalProfileActivationPendingField } from "@/api/generator/types/free-profile";
import type { PostListPost } from "@/api/generator/types/posts";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { MentorBadge } from "@/components/community/mentor-badge";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { PsychologistWhatsAppRedirectButton } from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { formatCrpLabel, formatCrpNumber } from "@/utils/crp";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

const PAGE_LIMIT = 5;
const PROFILE_TABS = ["geral", "publicacoes", "avaliacoes"] as const;

type ProfileTab = (typeof PROFILE_TABS)[number];

type ProfileTabNavigationOptions = {
  scrollToContentTop?: boolean;
};

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const tabs: Array<{ label: string; value: ProfileTab }> = [
  { label: "Geral", value: "geral" },
  { label: "Publicações", value: "publicacoes" },
  { label: "Avaliações", value: "avaliacoes" },
];

const PROFILE_CARD_SURFACE =
  "box-border rounded-[26px] border border-[#E6EAF0] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.045)] dark:border-border dark:bg-surface";

const PROFILE_SUBTLE_SURFACE =
  "box-border rounded-[18px] border border-[#E4EBF3] bg-white/88 shadow-[0_8px_20px_rgba(15,23,42,0.035)]";

const EMPTY_PUBLICATIONS_SUMMARY: DirectoryPsychologistParticipationSummary = {
  posts_count: 0,
  replies_count: 0,
  top_mentor_communities: [],
};

const PROFILE_ABOUT_MAX_LINES = 3;
const PROFILE_ABOUT_MORE_LABEL = "... ver mais";
const PROFILE_ABOUT_LESS_LABEL = "ver menos";
const PSYCHOLOGIST_DEFAULT_COVER_BACKGROUND = [
  "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.38) 24%, rgba(255,255,255,0) 48%)",
  "radial-gradient(circle at 82% 20%, rgba(96,165,250,0.34) 0%, rgba(96,165,250,0.08) 28%, rgba(96,165,250,0) 46%)",
  "radial-gradient(circle at 58% 104%, rgba(14,165,233,0.28) 0%, rgba(14,165,233,0.08) 34%, rgba(14,165,233,0) 58%)",
  "linear-gradient(135deg, #F5FBFF 0%, #DDEFFF 44%, #ABD7FF 100%)",
].join(", ");

const modalityLabel: Record<string, string> = {
  online: "Online",
  presencial: "Presencial",
  hibrido: "Online e presencial",
};

const languageLabel: Record<string, string> = {
  pt: "Português",
  "pt-br": "Português",
  en: "Inglês",
  es: "Espanhol",
  fr: "Francês",
};

const targetAudienceLabel: Record<string, string> = {
  adolescentes: "Adolescentes",
  adultos: "Adultos",
  criancas: "Crianças",
  idosos: "Idosos",
  casais: "Casais",
  familias: "Famílias",
  lgbtqia_plus: "LGBTQIA+",
};

const normalizeTab = (value: string | null): ProfileTab => {
  if (value === "sobre") return "geral";

  return PROFILE_TABS.includes(value as ProfileTab) ? (value as ProfileTab) : "geral";
};

const getPageFromParams = (params: URLSearchParams, key: string) => {
  const parsed = Number(params.get(key) || "1");

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
};

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const formatHeroRating = (ratingAvg: number) => {
  return (ratingAvg / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};

const formatExperienceLabel = (years?: number | null) => {
  if (!years || years <= 0) return null;

  return `${years} ${years === 1 ? "ano" : "anos"} de experiência`;
};

const getPsychologistTitle = (gender?: string | null) => {
  const normalized = gender?.toLowerCase();

  return normalized === "feminino" ? "Psicóloga" : "Psicólogo";
};

const getHonorificName = (profile: DirectoryPsychologistProfile) => {
  return profile.name
    .replace(/^(?:Dr\\.?\\s*|Dra\\.?\\s*)/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const formatRatingNumber = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "0,0";

  return (ratingAvg / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};

const formatDate = (value: string | null) => {
  if (!value) return "Data não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const toPsychologistWhatsAppIdentity = (profile: DirectoryPsychologistProfile) => ({
  avatar: profile.avatar,
  crp: profile.crp ? formatCrpNumber(profile.crp) : null,
  id: profile.id,
  name: profile.name,
  typeLabel: getPsychologistTitle(profile.gender),
  whatsappUrl: profile.whatsapp_url,
});

const scrollProfileContentIntoView = () => {
  if (typeof window === "undefined") return;

  const contentNode = document.getElementById("profile-content");

  if (!contentNode) return;

  const headerOffset = window.innerWidth < 1024 ? 88 : 0;
  const top = Math.max(0, contentNode.getBoundingClientRect().top + window.scrollY - headerOffset);

  window.scrollTo({ behavior: "smooth", top });
};

const translateLanguage = (language: string) => {
  const normalized = language.toLowerCase();

  return languageLabel[normalized] || language;
};

const translateTargetAudience = (target: string) => {
  return targetAudienceLabel[target] || target;
};

const buildBenefitTags = (profile: DirectoryPsychologistProfile) => {
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

const hasInPersonCare = (modality?: string | null) => {
  const normalized = modality?.toLowerCase() || "";

  return (
    normalized === "presencial" || normalized === "hibrido" || normalized.includes("presencial")
  );
};

const formatAttendanceLabel = (profile: DirectoryPsychologistProfile) => {
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

const resolveErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (apiError?.data?.status === 404 || normalized.includes("não encontrado")) {
    return "Este perfil não está publicado ou não está disponível para visualização.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar este perfil.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || fallback;
};

const InactivePublicProfileState = ({
  pendingFields,
}: {
  pendingFields: FreeProfessionalProfileActivationPendingField[];
}) => {
  const hasPendingFields = pendingFields.length > 0;

  return (
    <div className="grid min-h-[calc(100vh-160px)] place-items-center bg-[#F5F7FA] px-3 py-8 dark:bg-background">
      <article className="w-full max-w-[430px] rounded-[30px] border border-[#E4EBF3] bg-white p-5 text-center shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-border dark:bg-surface sm:p-6">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-danger/10 text-danger shadow-[0_14px_34px_rgba(239,68,68,0.10)]">
          <TriangleAlert className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
          Ativação do perfil
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-[#0F172A] dark:text-foreground">
          Seu perfil ainda não está ativo
        </h1>
        <p className="mx-auto mt-3 max-w-[350px] text-sm leading-6 text-[#536176] dark:text-muted">
          {hasPendingFields
            ? "Para exibir seu perfil publicamente na Lectum, complete as informações obrigatórias do seu perfil profissional."
            : "Seu perfil não possui campos obrigatórios pendentes, mas ainda não está disponível publicamente. Revise a publicação na tela de edição."}
        </p>

        {hasPendingFields ? (
          <div className="mt-5 rounded-[22px] border border-[#E4EBF3] bg-[#F8FBFF] p-4 text-left dark:border-border dark:bg-surface-muted">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#334155] dark:text-foreground">
              Pendências para publicação
            </p>
            <ul className="mt-3 grid gap-2.5">
              {pendingFields.map((field) => (
                <li
                  className="flex min-w-0 items-start gap-2.5 text-sm font-semibold leading-5 text-[#475569] dark:text-muted"
                  key={field.key}
                >
                  <TriangleAlert
                    className="mt-0.5 h-4 w-4 shrink-0 text-danger"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 break-words">{field.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-5 grid gap-2.5">
          <Button
            asChild
            className="h-12 rounded-full bg-primary text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(47,141,235,0.22)] hover:bg-primary/90"
          >
            <Link href="/app/professional/profile/setup">Completar perfil</Link>
          </Button>
          <Button asChild className="h-11 rounded-full" variant="outline">
            <Link href="/app/profile">Voltar ao perfil</Link>
          </Button>
        </div>
      </article>
    </div>
  );
};

const StarRating = ({ rating }: { rating: number }) => {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${rating} de 5 estrelas`}
      role="img"
    >
      {[1, 2, 3, 4, 5].map((item) => (
        <Star
          aria-hidden="true"
          className={cn("h-4 w-4 text-warning", item <= filled && "fill-warning")}
          key={item}
        />
      ))}
    </span>
  );
};

const formatList = (items: string[], empty = "Não informado") => {
  const visibleItems = items.map((item) => item.trim()).filter(Boolean);

  return visibleItems.length > 0 ? visibleItems.join(", ") : empty;
};

const ProfileInfoCard = ({
  compact,
  icon: Icon,
  label,
  value,
}: {
  compact?: boolean;
  icon: LucideIcon;
  label: string;
  value: string;
}) => (
  <article className={cn(PROFILE_SUBTLE_SURFACE, compact ? "px-3.5 py-3" : "px-4 py-3.5")}>
    <div className="flex min-h-0 items-start gap-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#247BD1]/75">
        <Icon className="h-[15px] w-[15px]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9.75px] font-semibold uppercase leading-none tracking-[0.06em] text-[#64748B]">
          {label}
        </p>
        <p
          className={cn(
            "mt-1.5 break-words text-[13.25px] font-bold leading-[1.42] tracking-[-0.01em] text-[#182033]",
            compact ? "line-clamp-3" : "line-clamp-4",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  </article>
);

const ProfileSectionCard = ({
  action,
  children,
  className,
  title,
  titleAccessory,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  title: string;
  titleAccessory?: ReactNode;
}) => (
  <section className={cn(PROFILE_CARD_SURFACE, "p-[18px] sm:p-5", className)}>
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="text-[1.08rem] font-extrabold leading-tight tracking-[-0.025em] text-[#182033] dark:text-foreground">
          {title}
        </h2>
        {titleAccessory}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const ProfileCountChip = ({
  pluralLabel,
  singularLabel,
  total,
}: {
  pluralLabel: string;
  singularLabel: string;
  total: number;
}) => (
  <span
    className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-[#D7E8FA] bg-[#F4FAFF] px-2 text-[11px] font-extrabold leading-none text-[#247BD1] shadow-[0_4px_10px_rgba(47,141,235,0.035)]"
    title={`${total} ${total === 1 ? singularLabel : pluralLabel}`}
  >
    {total.toLocaleString("pt-BR")}
  </span>
);

const PublicationCountChip = ({ total }: { total: number }) => (
  <ProfileCountChip pluralLabel="publicações" singularLabel="publicação" total={total} />
);

const ProfileTabHeaderCard = ({
  count,
  countLabelPlural,
  countLabelSingular,
  onBack,
  title,
}: {
  count: number;
  countLabelPlural: string;
  countLabelSingular: string;
  onBack: () => void;
  title: string;
}) => (
  <div className={cn(PROFILE_CARD_SURFACE, "p-4 sm:p-5")}>
    <div className="flex min-w-0 items-center gap-2.5">
      <button
        aria-label="Voltar para Geral"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#DDE7F2] bg-white text-[#334155] shadow-[0_6px_14px_rgba(15,23,42,0.045)] transition hover:-translate-x-0.5 hover:border-[#C8DDF3] hover:bg-[#F8FBFF] hover:text-[#173F72] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F8DEB]/35 dark:border-border dark:bg-surface dark:text-foreground"
        onClick={onBack}
        type="button"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate text-[15px] font-extrabold tracking-[-0.02em] text-[#182033]">
          {title}
        </h2>
        <ProfileCountChip
          pluralLabel={countLabelPlural}
          singularLabel={countLabelSingular}
          total={count}
        />
      </div>
    </div>
  </div>
);

const ProfileChipList = ({
  emptyMessage,
  items,
}: {
  emptyMessage: string;
  items: DirectoryCatalogItem[];
}) => {
  if (items.length === 0) {
    return <p className="mt-2.5 text-[13px] leading-[1.6] text-[#64748B]">{emptyMessage}</p>;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          className="inline-flex min-h-8 items-center rounded-full border border-[#D7E8FA] bg-[#F8FBFF] px-3 text-[12px] font-semibold leading-none text-[#1E4F8F] shadow-[0_4px_10px_rgba(47,141,235,0.035)]"
          key={item.id}
        >
          {item.name}
        </span>
      ))}
    </div>
  );
};

const ViewAllChipButton = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
  <button
    className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-[#CFE4FA] bg-white px-3.5 text-[13px] font-medium text-[#247BD1] transition hover:border-[#B9DAF8] hover:bg-[#F8FBFF] hover:text-[#1D65B2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
    onClick={onClick}
    style={{ fontSize: 13 }}
    type="button"
  >
    {children}
  </button>
);

const SectionChipLink = ({ children, href }: { children: ReactNode; href: string }) => (
  <Link
    className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-[#CFE4FA] bg-white px-3.5 text-[13px] font-medium text-[#247BD1] no-underline transition hover:border-[#B9DAF8] hover:bg-[#F8FBFF] hover:text-[#1D65B2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
    href={href}
    style={{ fontSize: 13 }}
  >
    {children}
  </Link>
);

const Pagination = ({
  currentPage,
  disabled,
  onPageChange,
  pages,
}: {
  currentPage: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  pages: number;
}) => {
  if (pages <= 1) return null;

  return (
    <nav
      aria-label="Paginação"
      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3"
    >
      <Button
        disabled={currentPage <= 1 || disabled}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
        variant="outline"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Anterior
      </Button>

      <span className="text-sm font-semibold text-muted">
        Página {currentPage} de {pages}
      </span>

      <Button
        disabled={currentPage >= pages || disabled}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
        variant="outline"
      >
        Próxima
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  );
};

const ProfileAvatar = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  const avatarSrc = resolvePublicMediaUrl(profile.avatar);
  const avatarIsPublicMedia = isPublicMediaUrl(profile.avatar);

  return (
    <div
      className="relative grid h-[76px] w-[76px] shrink-0 place-items-center overflow-hidden rounded-[18px] border-[4px] border-white bg-surface-muted text-2xl font-extrabold text-primary shadow-[0_12px_26px_rgba(15,23,42,0.10)] dark:border-background"
      data-profile-avatar="true"
    >
      {avatarSrc ? (
        <Image
          alt={profile.name}
          className="object-cover"
          fill
          priority
          sizes="76px"
          src={avatarSrc}
          unoptimized={avatarIsPublicMedia}
        />
      ) : (
        getInitials(profile.name)
      )}
    </div>
  );
};

const ProfileHeroMedia = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  const coverImageSrc = resolvePublicMediaUrl(profile.cover_image_url);
  const coverImageIsPublicMedia = isPublicMediaUrl(profile.cover_image_url);
  const [failedCoverImageUrl, setFailedCoverImageUrl] = useState<string | null>(null);
  const coverImageFailed = Boolean(coverImageSrc && failedCoverImageUrl === coverImageSrc);

  if (!coverImageSrc || coverImageFailed) {
    return (
      <div
        className="relative h-[132px] overflow-hidden"
        data-profile-default-cover="psychologist"
        style={{ background: PSYCHOLOGIST_DEFAULT_COVER_BACKGROUND }}
      >
        <span
          aria-hidden="true"
          className="-top-16 -left-10 absolute h-36 w-36 rounded-full bg-white/55 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="-right-12 absolute top-4 h-32 w-32 rounded-full bg-primary/18 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="absolute right-1/4 -bottom-16 h-28 w-48 rounded-full bg-primary/14 blur-3xl"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.14)_0%,rgba(15,23,42,0.02)_42%,rgba(255,255,255,0.12)_100%)]" />
      </div>
    );
  }

  return (
    <div className="relative h-[132px] overflow-hidden bg-black">
      <Image
        alt={`Imagem de capa de ${profile.name}`}
        className="h-full w-full object-cover object-center"
        fill
        priority={false}
        sizes="(min-width: 768px) 720px, 100vw"
        src={coverImageSrc}
        unoptimized={coverImageIsPublicMedia}
        onError={() => setFailedCoverImageUrl(coverImageSrc)}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,23,42,0.62)_0%,rgba(15,23,42,0.24)_30%,rgba(15,23,42,0.08)_58%,rgba(15,23,42,0.42)_100%)]" />
    </div>
  );
};

const ProfileHero = ({
  canFavorite,
  canEditProfile,
  favoritePending,
  onBack,
  onEditProfile,
  onShareProfile,
  onToggleFavorite,
  profile,
}: {
  canFavorite: boolean;
  canEditProfile: boolean;
  favoritePending: boolean;
  onBack: () => void;
  onEditProfile: () => void;
  onShareProfile: () => void;
  onToggleFavorite: () => void;
  profile: DirectoryPsychologistProfile;
}) => {
  const displayName = getHonorificName(profile) || profile.name || "Profissional";
  const headline = (profile.headline?.trim() || profile.bio?.trim() || "").trim();
  const benefitTags = buildBenefitTags(profile);
  const formattedCrp = formatCrpLabel(profile.crp);
  const experienceLabel =
    profile.show_experience_tag !== false ? formatExperienceLabel(profile.formation_years) : null;

  return (
    <header
      className="overflow-hidden rounded-b-[28px] border-b border-[#E6EAF0] bg-white pb-5 shadow-none dark:border-border dark:bg-surface"
      data-profile-hero="true"
    >
      <div className="relative text-white">
        <ProfileHeroMedia profile={profile} />

        <div className="absolute inset-x-0 top-4 z-10 flex items-center justify-between px-5">
          <button
            aria-label="Voltar para a tela anterior"
            className="grid h-10 w-10 place-items-center rounded-full bg-black/15 text-white backdrop-blur transition hover:bg-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2">
            {canEditProfile ? (
              <button
                aria-label="Editar perfil"
                className="grid h-10 w-10 place-items-center rounded-full bg-black/15 text-white backdrop-blur transition hover:bg-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                onClick={onEditProfile}
                type="button"
              >
                <PencilLine className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : null}

            <button
              aria-label="Compartilhar perfil"
              className="grid h-10 w-10 place-items-center rounded-full bg-black/15 text-white backdrop-blur transition hover:bg-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              onClick={onShareProfile}
              type="button"
            >
              <Share2 className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative px-5">
        <div className="-mt-8 flex items-start justify-between gap-4">
          <ProfileAvatar profile={profile} />

          <button
            aria-label={
              !canFavorite
                ? "Favoritos disponíveis apenas para usuários autenticados"
                : profile.favorited
                  ? `Remover ${profile.name} dos favoritos`
                  : `Favoritar ${profile.name}`
            }
            aria-pressed={profile.favorited}
            className={cn(
              "mt-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border text-[#64748B] shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
              profile.favorited
                ? "border-[#fecaca] bg-[#fef2f2] text-[#ef4444]"
                : "border-[#DBEAFE] bg-white text-[#64748B] hover:border-primary/40 hover:bg-primary-soft hover:text-primary dark:border-border dark:bg-surface-muted",
            )}
            disabled={favoritePending || !canFavorite}
            onClick={onToggleFavorite}
            title={
              !canFavorite ? "Favoritos disponíveis apenas para usuários autenticados" : undefined
            }
            type="button"
          >
            <Heart
              className={cn(
                "h-5 w-5",
                profile.favorited ? "fill-[#ef4444] text-[#ef4444]" : "fill-none",
              )}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          <h1 className="inline-flex min-w-0 flex-wrap items-center gap-1.5 text-[1.55rem] font-black leading-tight tracking-[-0.03em] text-[#182033] dark:text-foreground">
            <span className="break-words">{displayName}</span>
            {profile.verified ? (
              <VerifiedBadgeIcon aria-label="Perfil verificado" className="h-[18px] w-[18px]" />
            ) : null}
          </h1>

          <div className="grid gap-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-muted">
              {getPsychologistTitle(profile.gender)}
              <span aria-hidden="true">•</span>
              <span>{formattedCrp}</span>
              <span aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1 font-extrabold text-[#D97706]">
                <Star className="h-3.5 w-3.5 fill-[#D97706] text-[#D97706]" aria-hidden="true" />
                {formatHeroRating(profile.rating_avg)}
              </span>
            </p>

            {profile.available_today ? (
              <span
                className="inline-flex w-fit items-center gap-2 text-[12px] font-black text-[#16A34A]"
                data-availability-badge="true"
              >
                <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
                </span>
                Disponível hoje
              </span>
            ) : null}
          </div>

          {headline ? (
            <ExpandableAboutText containerClassName="mt-0.5 max-w-2xl" text={headline} />
          ) : null}

          {experienceLabel ? (
            <p className="text-[12.5px] font-semibold leading-5 text-[#64748B] dark:text-muted">
              {experienceLabel}
            </p>
          ) : null}

          {benefitTags.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-2" data-profile-benefit-tags="true">
              {benefitTags.map((tag) => {
                const Icon = tag.icon;

                return (
                  <span
                    className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-transparent px-2.5 py-1 text-[11.5px] font-semibold leading-none text-[#2563EB] dark:border-primary/35 dark:text-primary"
                    key={tag.label}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="whitespace-nowrap">{tag.label}</span>
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

const ProfileMobileStickyHeader = ({
  activeTab,
  onTabChange,
  profile,
}: {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab, options?: ProfileTabNavigationOptions) => void;
  profile: DirectoryPsychologistProfile;
}) => {
  const stickyName = getHonorificName(profile) || profile.name || "Profissional";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let animationFrame = 0;

    const updateVisibility = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        if (window.innerWidth >= 1024) {
          setVisible(false);
          return;
        }

        const presentationVideo = document.querySelector<HTMLElement>(
          '[data-presentation-video="true"]',
        );
        const profileHero = document.querySelector<HTMLElement>('[data-profile-hero="true"]');
        const thresholdNode = presentationVideo || profileHero;
        const thresholdBottom = thresholdNode?.getBoundingClientRect().bottom ?? 0;
        const nextVisible = thresholdBottom <= 84;

        setVisible((current) => (current === nextVisible ? current : nextVisible));
      });
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  const handleTabChange = (tab: ProfileTab) => {
    onTabChange(tab);
    window.requestAnimationFrame(scrollProfileContentIntoView);
  };

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 top-0 z-30 border-[#E5EAF0] border-b bg-white/92 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-[transform,opacity] duration-300 ease-out supports-[backdrop-filter]:bg-white/82 dark:border-border dark:bg-background/86 lg:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0",
      )}
      data-profile-mobile-sticky-header="true"
    >
      <div
        className="mx-auto w-full max-w-[430px] px-3 pb-2"
        style={{ paddingTop: "calc(0.45rem + env(safe-area-inset-top))" }}
      >
        <div className="flex min-w-0 items-center justify-center gap-1.5 px-2 pb-1">
          <span className="min-w-0 truncate text-[13.5px] font-extrabold leading-[1.25] tracking-[-0.02em] text-[#182033] dark:text-foreground">
            {stickyName}
          </span>
          {profile.verified ? (
            <VerifiedBadgeIcon
              aria-label="Perfil verificado"
              className="h-[14px] w-[14px] shrink-0"
            />
          ) : null}
        </div>

        <nav
          aria-label="Seções do perfil profissional"
          className="grid grid-cols-3 gap-1 rounded-full border border-[#E5EAF0] bg-white/72 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]"
        >
          {tabs.map((tab) => {
            const active = tab.value === activeTab;

            return (
              <button
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center justify-center rounded-full px-2 text-[12.8px] font-semibold tracking-[-0.015em] transition",
                  active
                    ? "bg-[#173F72] text-white shadow-[0_8px_18px_rgba(23,63,114,0.18)]"
                    : "text-[#64748B] hover:bg-[#F1F7FF] hover:text-[#1E4F8F]",
                )}
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                tabIndex={visible ? undefined : -1}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

const hashVideoSessionStorageKey = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
};

const createVideoSessionKey = (profileId: string, videoUrl: string) => {
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

const PRESENTATION_VIDEO_RETENTION_BUCKETS = Array.from(
  { length: 20 },
  (_, index) => (index + 1) * 5,
);

const PresentationVideo = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  const currentUser = useAppSelector((state) => state.user);
  const { mutate: trackVideoWatch } = useDirectoryPsychologistVideoWatch(profile.id);
  const cleanupTrackingRef = useRef<(() => void) | null>(null);
  const completedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const lastPlaybackPositionRef = useRef(0);
  const lastSentAtRef = useRef(0);
  const maxPositionRef = useRef(0);
  const milestonesRef = useRef({
    milestone_25: false,
    milestone_50: false,
    milestone_75: false,
    milestone_100: false,
  });
  const replayCountRef = useRef(0);
  const retentionBucketsRef = useRef<Set<number>>(new Set());
  const sessionKeyRef = useRef<string | null>(null);
  const watchedSecondsRef = useRef<Set<number>>(new Set());
  const videoSrc = resolvePublicMediaUrl(profile.video_url);
  const videoCoverSrc = resolvePublicMediaUrl(profile.video_cover_url);
  const shouldTrack = Boolean(videoSrc && currentUser?.id !== profile.id);

  const flushVideoAnalytics = useCallback(
    (video: HTMLVideoElement | null, completed = false, force = false) => {
      if (!shouldTrack || !video || !videoSrc) return;

      const now = Date.now();
      if (!force && now - lastSentAtRef.current < 5000) return;

      const durationSeconds = Number.isFinite(video.duration)
        ? Math.max(0, Math.round(video.duration))
        : 0;
      const maxPositionSeconds = Math.max(0, Math.round(maxPositionRef.current));
      const watchedSeconds = Math.max(0, watchedSecondsRef.current.size);

      if (watchedSeconds === 0 && maxPositionSeconds === 0 && !completed) return;

      sessionKeyRef.current ??= createVideoSessionKey(profile.id, videoSrc);

      if (completed) {
        completedRef.current = true;
        milestonesRef.current.milestone_100 = true;
      }

      const body: DirectoryPsychologistVideoWatchPayload = {
        session_key: sessionKeyRef.current,
        duration_seconds: durationSeconds,
        watched_seconds: watchedSeconds,
        max_position_seconds: maxPositionSeconds,
        replay_count: replayCountRef.current,
        completed: completedRef.current,
        ...milestonesRef.current,
      };

      lastSentAtRef.current = now;
      trackVideoWatch(body);
    },
    [profile.id, shouldTrack, trackVideoWatch, videoSrc],
  );

  const handleVideoReady = useCallback(
    (video: HTMLVideoElement | null) => {
      cleanupTrackingRef.current?.();
      cleanupTrackingRef.current = null;

      if (!video || !shouldTrack) return;

      const updateMilestones = () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return false;

        const retention = maxPositionRef.current / video.duration;
        const previous = { ...milestonesRef.current };
        milestonesRef.current = {
          milestone_25: previous.milestone_25 || retention >= 0.25,
          milestone_50: previous.milestone_50 || retention >= 0.5,
          milestone_75: previous.milestone_75 || retention >= 0.75,
          milestone_100: previous.milestone_100 || retention >= 0.98 || completedRef.current,
        };

        return (
          previous.milestone_25 !== milestonesRef.current.milestone_25 ||
          previous.milestone_50 !== milestonesRef.current.milestone_50 ||
          previous.milestone_75 !== milestonesRef.current.milestone_75 ||
          previous.milestone_100 !== milestonesRef.current.milestone_100
        );
      };

      const updateRetentionBuckets = () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return false;

        const reachedPercent = Math.min(
          100,
          Math.max(0, (maxPositionRef.current / video.duration) * 100),
        );
        const previousCount = retentionBucketsRef.current.size;

        for (const bucket of PRESENTATION_VIDEO_RETENTION_BUCKETS) {
          if (reachedPercent >= bucket || (bucket === 100 && completedRef.current)) {
            retentionBucketsRef.current.add(bucket);
          }
        }

        return previousCount !== retentionBucketsRef.current.size;
      };

      const addWatchedRange = (from: number, to: number) => {
        const start = Math.max(0, Math.floor(Math.min(from, to)));
        const end = Math.max(0, Math.ceil(Math.max(from, to)));

        for (let second = start; second <= end; second += 1) {
          watchedSecondsRef.current.add(second);
        }
      };

      const handlePlay = () => {
        if (hasStartedRef.current && completedRef.current && video.currentTime < 1.5) {
          replayCountRef.current += 1;
          completedRef.current = false;
        }

        hasStartedRef.current = true;
        lastPlaybackPositionRef.current = video.currentTime;
      };

      const handleTimeUpdate = () => {
        const currentTime = video.currentTime || 0;
        const previousTime = lastPlaybackPositionRef.current || 0;

        if (currentTime + 1 < previousTime && previousTime > 2 && currentTime < 1.5) {
          replayCountRef.current += 1;
          completedRef.current = false;
        }

        if (!video.paused && currentTime >= previousTime) {
          addWatchedRange(previousTime, currentTime);
        } else {
          watchedSecondsRef.current.add(Math.max(0, Math.floor(currentTime)));
        }

        maxPositionRef.current = Math.max(maxPositionRef.current, currentTime);
        lastPlaybackPositionRef.current = currentTime;

        const milestoneChanged = updateMilestones();
        const bucketChanged = updateRetentionBuckets();
        flushVideoAnalytics(video, false, milestoneChanged || bucketChanged);
      };

      const handleEnded = () => {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          addWatchedRange(lastPlaybackPositionRef.current, video.duration);
          maxPositionRef.current = Math.max(maxPositionRef.current, video.duration);
        }

        completedRef.current = true;
        updateMilestones();
        updateRetentionBuckets();
        flushVideoAnalytics(video, true, true);
      };

      const handlePause = () => flushVideoAnalytics(video, false, true);
      const handlePageHide = () => flushVideoAnalytics(video, false, true);

      video.addEventListener("play", handlePlay);
      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("ended", handleEnded);
      video.addEventListener("pause", handlePause);
      window.addEventListener("pagehide", handlePageHide);

      cleanupTrackingRef.current = () => {
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("ended", handleEnded);
        video.removeEventListener("pause", handlePause);
        window.removeEventListener("pagehide", handlePageHide);
      };
    },
    [flushVideoAnalytics, shouldTrack],
  );

  if (!videoSrc) return null;

  return (
    <div className="mt-3">
      <div className="mx-auto grid w-full gap-3 sm:max-w-[260px]">
        <article
          className="box-border relative w-full overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-[#e2e8f0] shadow-[0_8px_22px_rgba(15,23,42,0.055)]"
          data-presentation-video="true"
        >
          <VerticalVideoPlayer
            className="rounded-[18px] border-0"
            onVideoElementReady={handleVideoReady}
            poster={videoCoverSrc}
            src={videoSrc}
            title={`Vídeo de apresentação de ${profile.name}`}
          />
        </article>
      </div>
    </div>
  );
};
const AboutContactInfoBlock = () => (
  <div
    className="mt-4 rounded-[18px] border border-[#D7E8FA] bg-[#F8FBFF]/90 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]"
    data-about-contact-block="true"
  >
    <p className="text-[13.5px] font-extrabold leading-tight tracking-[-0.015em] text-[#182033]">
      Quer falar com o psicólogo?
    </p>
    <p className="mt-1.5 text-[12.75px] font-medium leading-[1.55] text-[#64748B]">
      Para consultar agenda, valores e informações do atendimento, chame o psicólogo no WhatsApp.
    </p>
  </div>
);

const ExpandableAboutText = ({
  containerClassName,
  moreClassName,
  text,
  textClassName,
}: {
  containerClassName?: string;
  moreClassName?: string;
  text: string;
  textClassName?: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState(text.trim());
  const [truncated, setTruncated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLParagraphElement>(null);
  const content = text.trim();
  const paragraphClassName = cn(
    "whitespace-pre-line text-[14px] font-medium leading-[1.65] text-[#334155] dark:text-foreground/80 sm:text-[14.5px]",
    textClassName,
  );

  useLayoutEffect(() => {
    const containerNode = containerRef.current;
    const measureNode = measureRef.current;

    if (!containerNode || !measureNode) return;

    let animationFrame = 0;
    let cancelled = false;

    const lineHeightPx = () => {
      const styles = window.getComputedStyle(measureNode);
      const parsedLineHeight = Number.parseFloat(styles.lineHeight);

      if (Number.isFinite(parsedLineHeight)) return parsedLineHeight;

      const parsedFontSize = Number.parseFloat(styles.fontSize);
      return Number.isFinite(parsedFontSize) ? parsedFontSize * 1.6 : 22;
    };

    const fitsWithinMaxLines = (value: string) => {
      measureNode.textContent = value;

      return measureNode.scrollHeight <= lineHeightPx() * PROFILE_ABOUT_MAX_LINES + 1;
    };

    const measure = () => {
      if (cancelled) return;

      const availableWidth = containerNode.getBoundingClientRect().width;
      const normalizedText = content.trimEnd();

      if (availableWidth <= 0 || normalizedText.length === 0) {
        setPreview(content);
        setTruncated(false);
        return;
      }

      const safeAvailableWidth = Math.max(0, availableWidth - 32);

      measureNode.style.width = `${safeAvailableWidth}px`;

      if (fitsWithinMaxLines(normalizedText)) {
        setPreview(content);
        setTruncated(false);
        return;
      }

      let low = 0;
      let high = normalizedText.length;
      let bestPreview = "";

      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const candidatePreview = normalizedText.slice(0, middle).trimEnd();
        const candidate = `${candidatePreview} ${PROFILE_ABOUT_MORE_LABEL}  `;

        if (fitsWithinMaxLines(candidate)) {
          bestPreview = candidatePreview;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }

      setPreview(bestPreview || normalizedText.slice(0, 1));
      setTruncated(true);
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(containerNode);

    if ("fonts" in document) {
      void document.fonts.ready.then(scheduleMeasure);
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [content]);

  const toggleExpanded = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setExpanded((previous) => !previous);
  };

  return (
    <div
      className={cn("relative mt-2.5 min-w-0 max-w-full", containerClassName)}
      ref={containerRef}
    >
      <p className={paragraphClassName}>
        {expanded || !truncated ? content : preview}
        {truncated ? (
          <>
            {" "}
            <button
              className={cn(
                "pointer-events-auto inline cursor-pointer rounded-none border-0 bg-transparent p-0 align-baseline font-semibold text-[#2563EB]/85 [font-size:inherit] [line-height:inherit] hover:text-[#1D4ED8]",
                moreClassName,
              )}
              onClick={toggleExpanded}
              type="button"
            >
              {expanded ? PROFILE_ABOUT_LESS_LABEL : PROFILE_ABOUT_MORE_LABEL}
            </button>
          </>
        ) : null}
      </p>
      <p
        aria-hidden="true"
        className={cn(
          paragraphClassName,
          "pointer-events-none invisible absolute inset-x-0 top-0 opacity-0",
        )}
        ref={measureRef}
      >
        {content}
      </p>
    </div>
  );
};

const FormationSection = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  const formations = profile.academic_formations ?? [];
  const hasAnyFormation = formations.length > 0;

  return (
    <ProfileSectionCard title="Formação & Títulos">
      {hasAnyFormation ? (
        <div className="mt-3 grid gap-2.5">
          {formations.map((formation, index) => {
            const institutionLine = formatList(
              [formation.institution || "", formation.graduation_year || ""],
              "Instituição e data não informadas",
            );

            return (
              <article
                className="box-border flex items-start gap-3 rounded-[16px] border border-[#E4EBF3] bg-[#FAFCFF] px-3.5 py-3 shadow-[0_5px_16px_rgba(15,23,42,0.025)]"
                key={`${formation.title || "formacao"}-${formation.institution || index}`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-white text-[#247BD1] shadow-[0_7px_18px_rgba(47,141,235,0.10)]">
                  <GraduationCap className="h-[17px] w-[17px]" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-extrabold leading-[1.35] tracking-[-0.01em] text-[#182033]">
                    {formation.title || "Título não informado"}
                  </p>
                  <p className="mt-1 text-[12.5px] font-medium leading-[1.45] text-[#64748B]">
                    {institutionLine}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-2.5 text-[13px] leading-[1.6] text-[#64748B]">
          Este profissional ainda não cadastrou formação e títulos.
        </p>
      )}
    </ProfileSectionCard>
  );
};

const ReviewPreviewCard = ({ review }: { review: DirectoryPsychologistProfileReview }) => {
  return (
    <article className="mt-3 box-border rounded-[18px] border border-[#E4EBF3] bg-[#FAFCFF] p-3.5 shadow-[0_7px_18px_rgba(15,23,42,0.025)]">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#EAF5FF] text-[12px] font-extrabold text-[#247BD1] shadow-[0_6px_14px_rgba(47,141,235,0.08)]">
          {review.author.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-extrabold text-[#182033]">
                {review.author.name}
              </p>
              <p className="mt-0.5 text-[12px] text-[#64748B]">{formatDate(review.created_at)}</p>
            </div>
            <StarRating rating={review.rating} />
          </div>

          <p className="mt-2.5 line-clamp-3 text-[13px] leading-[1.6] text-[#475569]">
            &ldquo;{review.comment || "Avaliação publicada sem comentário textual."}&rdquo;
          </p>
        </div>
      </div>
    </article>
  );
};

const ReviewsPreviewSection = ({
  highlightedReview,
  isVerifiedSubscriber,
  isError,
  isLoading,
  onViewAll,
  psychologistId,
  reviews,
  summary,
}: {
  isVerifiedSubscriber: boolean;
  isError: boolean;
  isLoading: boolean;
  onViewAll: () => void;
  psychologistId: string;
  highlightedReview?: DirectoryPsychologistProfileReview | null;
  reviews: DirectoryPsychologistProfileReview[];
  summary: DirectoryReviewSummary;
}) => {
  const featuredReview = highlightedReview ?? reviews[0];
  const hasReviews = summary.rating_count > 0 || reviews.length > 0;
  const action = isVerifiedSubscriber ? (
    hasReviews ? (
      <ViewAllChipButton onClick={onViewAll}>Ver todas</ViewAllChipButton>
    ) : (
      <SectionChipLink href={`/app/reviews/new?psychologist_id=${psychologistId}`}>
        Avaliar
      </SectionChipLink>
    )
  ) : null;

  return (
    <ProfileSectionCard action={action} title="Avaliações">
      {hasReviews ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-end gap-2">
              <p className="text-[30px] font-extrabold leading-none tracking-[-0.03em] text-[#182033]">
                {formatRatingNumber(summary.rating_avg, summary.rating_count)}
              </p>
              <p className="pb-0.5 text-[13px] font-medium text-[#64748B]">
                {summary.rating_count} avaliações
              </p>
            </div>
            <div className="mt-1.5">
              <StarRating rating={summary.rating_avg / 100} />
            </div>
          </div>
        </div>
      ) : null}

      {isError ? (
        <p className="mt-3 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[11px] leading-[1.4] text-[#991B1B]">
          Não foi possível carregar a prévia de avaliações.
        </p>
      ) : null}

      {isLoading ? <LoadingState label="Carregando avaliações" /> : null}

      {!isLoading && !isError && featuredReview ? (
        <ReviewPreviewCard review={featuredReview} />
      ) : null}

      {!isLoading && !isError && !featuredReview ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[13px] leading-[1.6] text-[#64748B]">
            Este profissional ainda não possui avaliações.
          </p>
        </div>
      ) : null}
    </ProfileSectionCard>
  );
};

const ProfileCommunityPostCard = ({
  canInteract,
  onShare,
  post,
}: {
  canInteract: boolean;
  onShare: (post: PostListPost) => void;
  post: DirectoryPsychologistProfilePost;
}) => (
  <CommunityPostCard
    interactiveActions={canInteract}
    onShare={onShare}
    post={post}
    profilePublicationMode
  />
);

const formatPublicationMetric = (value: number) => value.toLocaleString("pt-BR");

const PublicationCommunityAvatar = ({
  community,
}: {
  community: DirectoryPsychologistTopMentorCommunity;
}) => {
  const avatarSrc = resolvePublicMediaUrl(community.avatar_url);
  const avatarIsPublicMedia = isPublicMediaUrl(community.avatar_url);

  return (
    <span
      className="relative grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full border-[3px] border-white text-[18px] font-extrabold ring-1 ring-[#DCEBFA]"
      data-top-mentor-avatar="true"
      style={{
        background:
          community.visual_soft_color ||
          community.visual_gradient_color ||
          "linear-gradient(135deg, #EAF5FF 0%, #D7ECFF 100%)",
        color: community.visual_text_color || community.visual_primary_dark_color || "#1D65B2",
      }}
    >
      {avatarSrc ? (
        <Image
          alt={`Comunidade ${community.name}`}
          className="object-cover"
          fill
          sizes="72px"
          src={avatarSrc}
          unoptimized={avatarIsPublicMedia}
        />
      ) : (
        getInitials(community.name)
      )}
    </span>
  );
};

const PublicationTopMentorCommunity = ({
  community,
}: {
  community: DirectoryPsychologistTopMentorCommunity;
}) => (
  <Link
    className="group flex w-[132px] min-w-[132px] snap-start flex-col items-center rounded-[18px] px-1 py-1.5 text-center no-underline transition hover:bg-[#F8FBFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:w-[140px] sm:min-w-[140px]"
    data-top-mentor-community="true"
    href={`/app/community/${community.slug}`}
  >
    <span className="relative flex w-full justify-center pb-4">
      <PublicationCommunityAvatar community={community} />
      <span className="absolute -bottom-0.5 left-1/2 flex min-w-[124px] -translate-x-1/2 justify-center">
        <MentorBadge
          badge={community.badge}
          className="min-w-[124px] justify-center whitespace-nowrap px-2.5 py-1 text-[8.5px]"
        />
      </span>
    </span>
    <span
      className="mt-1.5 line-clamp-2 w-full max-w-[124px] text-center text-[12.5px] font-extrabold leading-[1.18] tracking-[-0.02em] text-[#475569] transition group-hover:text-[#182033] sm:max-w-[132px]"
      data-top-mentor-name="true"
    >
      {community.name}
    </span>
  </Link>
);

const PublicationMetric = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) => (
  <span className="inline-flex min-w-0 items-center gap-2 text-[13px] font-bold leading-none text-[#64748B]">
    <Icon className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden="true" />
    <span className="whitespace-nowrap">
      <strong className="font-extrabold text-[#182033]">{formatPublicationMetric(value)}</strong>{" "}
      {label}
    </span>
  </span>
);

const PublicationsActivitySummary = ({
  summary,
}: {
  summary: DirectoryPsychologistParticipationSummary;
}) => {
  const topCommunities = summary.top_mentor_communities.slice(0, 3);
  const hasTopCommunities = topCommunities.length > 0;
  const hasMetrics = summary.posts_count > 0 || summary.replies_count > 0;

  if (!hasTopCommunities && !hasMetrics) return null;

  return (
    <section
      className="overflow-hidden rounded-[24px] border border-[#E7EEF7] bg-white/95 px-3 py-4 sm:px-5"
      data-publications-summary="true"
    >
      {hasTopCommunities ? (
        <div className="flex snap-x gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-center sm:gap-4">
          {topCommunities.map((community) => (
            <PublicationTopMentorCommunity community={community} key={community.id} />
          ))}
        </div>
      ) : null}

      {hasMetrics ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5",
            hasTopCommunities && "mt-3.5 border-[#EEF3F8] border-t pt-3.5",
          )}
        >
          <PublicationMetric icon={FileText} label="Posts" value={summary.posts_count} />
          <span className="hidden h-5 w-px bg-[#E5ECF3] sm:block" aria-hidden="true" />
          <PublicationMetric icon={CornerUpLeft} label="Respostas" value={summary.replies_count} />
        </div>
      ) : null}
    </section>
  );
};

const PostsPreviewSection = ({
  canInteract,
  highlightedPublication,
  isError,
  isLoading,
  onShare,
  onViewAll,
  posts,
  total,
}: {
  canInteract: boolean;
  highlightedPublication?: DirectoryPsychologistProfilePost | null;
  isError: boolean;
  isLoading: boolean;
  onShare: (post: PostListPost) => void;
  onViewAll: () => void;
  posts: DirectoryPsychologistProfilePost[];
  total: number;
}) => {
  const featuredPost = highlightedPublication ?? posts[0];

  return (
    <ProfileSectionCard
      action={
        total > 0 ? <ViewAllChipButton onClick={onViewAll}>Ver todas</ViewAllChipButton> : null
      }
      title="Publicações"
      titleAccessory={<PublicationCountChip total={total} />}
    >
      {isError ? (
        <p className="mt-3 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[11px] leading-[1.4] text-[#991B1B]">
          Não foi possível carregar a prévia de publicações.
        </p>
      ) : null}

      {isLoading ? <LoadingState label="Carregando publicações" /> : null}

      {!isLoading && !isError && featuredPost ? (
        <div className="mt-3">
          <ProfileCommunityPostCard
            canInteract={canInteract}
            onShare={onShare}
            post={featuredPost}
          />
        </div>
      ) : null}

      {!isLoading && !isError && !featuredPost ? (
        <p className="mt-3 text-[13px] leading-[1.6] text-[#64748B]">
          Este profissional ainda não possui publicações públicas.
        </p>
      ) : null}
    </ProfileSectionCard>
  );
};

const AboutTab = ({
  canInteractPosts,
  onTabChange,
  onSharePost,
  postsPreview,
  profile,
  reviewsPreview,
}: {
  canInteractPosts: boolean;
  onTabChange: (tab: ProfileTab, options?: ProfileTabNavigationOptions) => void;
  onSharePost: (post: PostListPost) => void;
  postsPreview: {
    isError: boolean;
    isLoading: boolean;
    highlightedPublication?: DirectoryPsychologistProfilePost | null;
    posts: DirectoryPsychologistProfilePost[];
    total: number;
  };
  profile: DirectoryPsychologistProfile;
  reviewsPreview: {
    isError: boolean;
    isLoading: boolean;
    highlightedReview?: DirectoryPsychologistProfileReview | null;
    reviews: DirectoryPsychologistProfileReview[];
    summary: DirectoryReviewSummary;
  };
}) => {
  const bioText = profile.bio?.trim() ?? "";
  const serviceText = formatList(
    profile.services.map((item) => item.name),
    "Serviços não informados.",
  );
  const approachText = formatList(
    profile.approaches.map((item) => item.name),
    "Abordagens não informadas.",
  );
  const targetText = formatList(
    (profile.target_audience ?? []).map(translateTargetAudience),
    "Público atendido não informado.",
  );
  const languageText = formatList(
    profile.languages.map(translateLanguage),
    "Idiomas não informados.",
  );
  const modalityText = formatList([formatAttendanceLabel(profile)], "Modalidade não informada.");

  return (
    <div className="grid gap-3.5 bg-[#F5F7FA] px-3 pt-3.5 pb-1 dark:bg-background sm:px-4 sm:pt-4">
      <ProfileSectionCard title="Sobre">
        {bioText ? <ExpandableAboutText text={bioText} /> : null}
        <PresentationVideo profile={profile} />
        {profile.whatsapp_url ? <AboutContactInfoBlock /> : null}
      </ProfileSectionCard>

      <ProfileSectionCard title="Especialidades">
        <ProfileChipList
          emptyMessage="Este profissional ainda não informou especialidades públicas."
          items={profile.specialties}
        />
      </ProfileSectionCard>

      <ReviewsPreviewSection
        highlightedReview={reviewsPreview.highlightedReview}
        isVerifiedSubscriber={profile.verified}
        isError={reviewsPreview.isError}
        isLoading={reviewsPreview.isLoading}
        onViewAll={() => onTabChange("avaliacoes", { scrollToContentTop: true })}
        psychologistId={profile.id}
        reviews={reviewsPreview.reviews}
        summary={reviewsPreview.summary}
      />

      <ProfileSectionCard title="Atendimento" className="mb-0">
        <div className="mt-3 grid gap-2.5">
          <ProfileInfoCard compact icon={MapPin} label="Modalidade" value={modalityText} />
          <ProfileInfoCard
            compact
            icon={MessageSquareText}
            label="Abordagens"
            value={approachText}
          />
          <ProfileInfoCard compact icon={BriefcaseBusiness} label="Serviços" value={serviceText} />
          <ProfileInfoCard compact icon={UsersRound} label="Público atendido" value={targetText} />
          <ProfileInfoCard compact icon={Languages} label="Idiomas" value={languageText} />
        </div>
      </ProfileSectionCard>

      <FormationSection profile={profile} />

      <PostsPreviewSection
        canInteract={canInteractPosts}
        highlightedPublication={postsPreview.highlightedPublication}
        isError={postsPreview.isError}
        isLoading={postsPreview.isLoading}
        onShare={onSharePost}
        onViewAll={() => onTabChange("publicacoes", { scrollToContentTop: true })}
        posts={postsPreview.posts}
        total={postsPreview.total}
      />
    </div>
  );
};

const PostsTab = ({
  canInteract,
  currentPage,
  error,
  isError,
  isFetching,
  isLoading,
  onBackToOverview,
  onPageChange,
  onShare,
  pages,
  posts,
  summary,
  total,
}: {
  canInteract: boolean;
  currentPage: number;
  error: unknown;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  onBackToOverview: () => void;
  onShare: (post: PostListPost) => void;
  onPageChange: (page: number) => void;
  pages: number;
  posts: DirectoryPsychologistProfilePost[];
  summary: DirectoryPsychologistParticipationSummary;
  total: number;
}) => {
  return (
    <div className="grid gap-3.5 bg-[#F5F7FA] px-3 pb-1 pt-3.5 dark:bg-background sm:px-4 sm:pt-4">
      <ProfileTabHeaderCard
        count={total}
        countLabelPlural="publicações"
        countLabelSingular="publicação"
        onBack={onBackToOverview}
        title="Publicações"
      />

      <PublicationsActivitySummary summary={summary} />

      {isError ? (
        <InlineAlert title="Não foi possível carregar publicações" variant="error">
          {resolveErrorMessage(error, "Não foi possível carregar as publicações deste perfil.")}
        </InlineAlert>
      ) : null}

      {isLoading ? (
        <div className="box-border grid min-h-[30vh] place-items-center rounded-[22px] border border-[#E6EAF0] bg-white">
          <LoadingState label="Carregando publicações" />
        </div>
      ) : null}

      {!isLoading && !isError && posts.length === 0 ? (
        <EmptyState
          description="Este profissional ainda não possui publicações persistidas e publicadas."
          icon={FileText}
          title="Nenhuma publicação pública"
        />
      ) : null}

      {!isLoading && !isError && posts.length > 0 ? (
        <div className="grid gap-3.5">
          {posts.map((post) => (
            <ProfileCommunityPostCard
              canInteract={canInteract}
              key={`${post.contribution_type}-${post.id}-${post.highlighted_professional_reply?.id ?? "post"}`}
              onShare={onShare}
              post={post}
            />
          ))}
        </div>
      ) : null}

      <Pagination
        currentPage={currentPage}
        disabled={isFetching}
        onPageChange={onPageChange}
        pages={pages}
      />
    </div>
  );
};

const ReviewSummaryCard = ({
  psychologistId,
  summary,
}: {
  psychologistId: string;
  summary: DirectoryReviewSummary;
}) => {
  if (summary.rating_count <= 0) {
    return (
      <article className={cn(PROFILE_CARD_SURFACE, "p-4 sm:p-5")}>
        <p className="text-[13px] leading-[1.6] text-[#64748B]">
          Este profissional ainda não possui avaliações.
        </p>
      </article>
    );
  }

  const max = Math.max(1, summary.rating_count);

  return (
    <article className={cn(PROFILE_CARD_SURFACE, "grid gap-4 p-4 sm:p-5")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[36px] font-extrabold leading-none tracking-[-0.04em] text-[#182033]">
            {formatRatingNumber(summary.rating_avg, summary.rating_count)}
          </p>
          <div className="mt-1.5">
            <StarRating rating={summary.rating_avg / 100} />
          </div>
          <p className="mt-1.5 text-[13px] font-medium text-[#64748B]">
            {summary.rating_count} avaliações
          </p>
        </div>
        <Button
          asChild
          className="h-10 shrink-0 cursor-pointer rounded-full border-[#CFE4FA] bg-white px-4 text-[12.5px] font-extrabold text-[#247BD1] hover:border-[#B8D9F8] hover:bg-[#F4FAFF] hover:text-[#1769B8] focus-visible:outline-[#2F8DEB] sm:px-[18px] sm:text-[13px]"
          variant="outline"
        >
          <Link href={`/app/reviews/new?psychologist_id=${psychologistId}`}>Avaliar</Link>
        </Button>
      </div>

      <div className="grid gap-2.5">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = summary.distribution[rating as 1 | 2 | 3 | 4 | 5] ?? 0;
          const percent = Math.round((count / max) * 100);

          return (
            <div className="grid grid-cols-[20px_1fr_42px] items-center gap-2.5" key={rating}>
              <span className="text-[11px] font-semibold text-[#64748B]">{rating}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-[#E2E8F0]">
                <span
                  className="block h-full rounded-full bg-[#FACC15]"
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="text-right text-[11px] font-semibold text-[#64748B]">
                {percent}%
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
};

const ReviewCard = ({ review }: { review: DirectoryPsychologistProfileReview }) => {
  return (
    <article className={cn(PROFILE_CARD_SURFACE, "p-4 sm:p-5")}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#EAF5FF] text-[12px] font-extrabold text-[#247BD1] shadow-[0_7px_16px_rgba(47,141,235,0.09)]">
          {review.author.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[13.5px] font-extrabold tracking-[-0.01em] text-[#182033]">
                {review.author.name}
              </h2>
              <p className="mt-0.5 text-[12px] text-[#64748B]">{formatDate(review.created_at)}</p>
            </div>
            <StarRating rating={review.rating} />
          </div>

          {review.comment ? (
            <p className="mt-3 text-[13px] leading-[1.62] text-[#475569]">
              &ldquo;{review.comment}&rdquo;
            </p>
          ) : (
            <p className="mt-3 text-[13px] leading-[1.62] text-[#64748B]">
              Avaliação publicada sem comentário textual.
            </p>
          )}
          {review.response ? (
            <div className="mt-3 rounded-[16px] border border-[#D7E8FA] border-l-[3px] border-l-[#2F8DEB] bg-[#F8FBFF] px-3.5 py-3">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.075em] text-[#247BD1]">
                Resposta do profissional
              </p>
              <p className="mt-1.5 text-[13px] leading-[1.6] text-[#182033]">
                &ldquo;{review.response}&rdquo;
              </p>
              {review.responded_at ? (
                <p className="mt-1.5 text-[11px] text-[#64748B]">
                  Respondido em {formatDate(review.responded_at)}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
};

const ReviewsTab = ({
  currentPage,
  error,
  isError,
  isFetching,
  isLoading,
  onBackToOverview,
  onPageChange,
  pages,
  profileId,
  reviews,
  summary,
}: {
  currentPage: number;
  error: unknown;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  onBackToOverview: () => void;
  onPageChange: (page: number) => void;
  pages: number;
  profileId: string;
  reviews: DirectoryPsychologistProfileReview[];
  summary: DirectoryReviewSummary;
}) => {
  return (
    <div className="grid gap-3.5 bg-[#F5F7FA] px-3 pb-1 pt-3.5 dark:bg-background sm:px-4 sm:pt-4">
      <ProfileTabHeaderCard
        count={summary.rating_count}
        countLabelPlural="avaliações"
        countLabelSingular="avaliação"
        onBack={onBackToOverview}
        title="Avaliações"
      />
      <ReviewSummaryCard psychologistId={profileId} summary={summary} />

      {isError ? (
        <InlineAlert title="Não foi possível carregar avaliações" variant="error">
          {resolveErrorMessage(error, "Não foi possível carregar as avaliações deste perfil.")}
        </InlineAlert>
      ) : null}

      {isLoading ? (
        <div className="box-border grid min-h-[30vh] place-items-center rounded-[22px] border border-[#E6EAF0] bg-white">
          <LoadingState label="Carregando avaliações" />
        </div>
      ) : null}

      {!isLoading && !isError && reviews.length > 0 ? (
        <div className="grid gap-3.5">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : null}

      {isFetching && !isLoading ? <LoadingState label="Atualizando avaliações" /> : null}

      <Pagination
        currentPage={currentPage}
        disabled={isFetching}
        onPageChange={onPageChange}
        pages={pages}
      />
    </div>
  );
};

const WhatsAppCta = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  if (!profile.whatsapp_url) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-x-3 z-30 rounded-[18px] border border-[#DDE7F2] bg-white/96 p-2 shadow-[0_-6px_18px_rgba(15,23,42,0.12)] backdrop-blur sm:inset-x-4 lg:hidden"
        style={{ bottom: "var(--lectum-mobile-nav-aware-fab-bottom)" }}
      >
        <div className="mx-auto w-full max-w-[430px]">
          <PsychologistWhatsAppRedirectButton
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-success text-[13px] font-bold text-white transition hover:bg-success/90"
            psychologist={toPsychologistWhatsAppIdentity(profile)}
          >
            <WhatsAppIcon className="h-4 w-4" aria-hidden="true" />
            Chamar no WhatsApp
          </PsychologistWhatsAppRedirectButton>
        </div>
      </div>

      <PsychologistWhatsAppRedirectButton
        aria-label={`Chamar ${profile.name} no WhatsApp`}
        className="group fixed right-5 bottom-10 z-40 hidden h-14 w-14 place-items-center rounded-full border-[5px] border-white bg-[#16A34A] text-white shadow-[0_14px_30px_rgba(22,163,74,0.26)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:bg-[#15803D] hover:shadow-[0_18px_36px_rgba(22,163,74,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-safe:animate-[lectum-desktop-create-float_4.2s_ease-in-out_infinite] lg:grid lg:h-16 lg:w-16 xl:right-20 2xl:right-28"
        psychologist={toPsychologistWhatsAppIdentity(profile)}
        title="Chamar no WhatsApp"
      >
        <WhatsAppIcon
          className="h-7 w-7 transition group-hover:scale-105 lg:h-8 lg:w-8"
          aria-hidden="true"
        />
        <span className="sr-only">Chamar no WhatsApp</span>
      </PsychologistWhatsAppRedirectButton>
    </>
  );
};

export const PsychologistProfileLogic = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [shareFeedback, setShareFeedback] = useState(false);
  const [pendingScrollTab, setPendingScrollTab] = useState<ProfileTab | null>(null);
  const currentUser = useAppSelector((state) => state.user);
  const conversion = useProgressiveConversion();
  const canFavoritePsychologists = conversion.isAuthenticated;
  const id = params.id;
  const canInspectInactiveOwnProfile = currentUser?.role === "psicologo" && currentUser.id === id;
  const ownFreeProfile = usePsychologistFreeProfile({
    enabled: Boolean(canInspectInactiveOwnProfile),
  });

  const urlParams = useMemo(() => new URLSearchParams(searchParamsString), [searchParamsString]);
  const activeTab = useMemo(() => normalizeTab(urlParams.get("tab")), [urlParams]);
  const postsPage = useMemo(() => getPageFromParams(urlParams, "postsPage"), [urlParams]);
  const reviewsPage = useMemo(() => getPageFromParams(urlParams, "reviewsPage"), [urlParams]);
  const postsQuery = useMemo(
    () => ({ page: activeTab === "geral" ? 1 : postsPage, limit: PAGE_LIMIT }),
    [activeTab, postsPage],
  );
  const reviewsQuery = useMemo(
    () => ({ page: activeTab === "geral" ? 1 : reviewsPage, limit: PAGE_LIMIT }),
    [activeTab, reviewsPage],
  );

  const profileQuery = useDirectoryPsychologist(id);
  const profile = profileQuery.data;
  const posts = useDirectoryPsychologistPosts(
    id,
    postsQuery,
    (activeTab === "publicacoes" || activeTab === "geral") && Boolean(profile),
  );
  const reviews = useDirectoryPsychologistReviews(
    id,
    reviewsQuery,
    (activeTab === "avaliacoes" || activeTab === "geral") && Boolean(profile),
  );
  const { favoritePsychologist, unfavoritePsychologist } = usePatient({ enableProfile: false });

  const navigateWithParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParamsString);
      mutate(next);
      const queryString = next.toString();

      router.replace(`/app/psychologist/${id}${queryString ? `?${queryString}` : ""}`, {
        scroll: false,
      });
    },
    [id, router, searchParamsString],
  );

  const setActiveTab = (tab: ProfileTab, options?: ProfileTabNavigationOptions) => {
    if (options?.scrollToContentTop) {
      setPendingScrollTab(tab);
    } else {
      setPendingScrollTab(null);
    }

    navigateWithParams((next) => {
      if (tab === "geral") next.delete("tab");
      else next.set("tab", tab);
      next.delete("postsPage");
      next.delete("reviewsPage");
    });
  };

  const setPostsPage = (page: number) => {
    navigateWithParams((next) => {
      next.set("tab", "publicacoes");
      if (page > 1) next.set("postsPage", String(page));
      else next.delete("postsPage");
    });
  };

  const setReviewsPage = (page: number) => {
    navigateWithParams((next) => {
      next.set("tab", "avaliacoes");
      if (page > 1) next.set("reviewsPage", String(page));
      else next.delete("reviewsPage");
    });
  };

  useEffect(() => {
    if (!pendingScrollTab) return;
    if (activeTab !== pendingScrollTab) return;
    if (typeof window === "undefined") return;

    const targetIsReady =
      pendingScrollTab === "publicacoes"
        ? !posts.isLoading
        : pendingScrollTab === "avaliacoes"
          ? !reviews.isLoading
          : true;

    if (!targetIsReady) return;

    let firstFrame = 0;
    let secondFrame = 0;

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        scrollProfileContentIntoView();
        setPendingScrollTab(null);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [activeTab, pendingScrollTab, posts.isLoading, reviews.isLoading]);

  const toggleFavorite = () => {
    if (!profile) return;
    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_favorito", {
        intent: {
          payload: {
            psychologistId: profile.id,
          },
          type: "favorite_psychologist",
        },
      });
      return;
    }
    if (!canFavoritePsychologists) return;

    if (profile.favorited) {
      unfavoritePsychologist.mutate(profile.id);
      return;
    }

    favoritePsychologist.mutate(profile.id);
  };

  useEffect(() => {
    if (!conversion.isAuthenticated || !profile) return;

    const intent = conversion.consumePendingIntent(
      (candidate) =>
        candidate.type === "favorite_psychologist" &&
        String(candidate.payload?.psychologistId ?? "") === profile.id,
    );
    const psychologistId = String(intent?.payload?.psychologistId ?? "");

    if (!psychologistId || psychologistId !== profile.id || profile.favorited) return;

    favoritePsychologist.mutate(profile.id);
  }, [conversion, favoritePsychologist, profile]);

  const shareProfile = async () => {
    if (typeof window === "undefined") return;

    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: "Perfil profissional Lectum", url });
      } else {
        await navigator.clipboard.writeText(url);
      }

      setShareFeedback(true);
      window.setTimeout(() => setShareFeedback(false), 2500);
    } catch {
      setShareFeedback(false);
    }
  };

  const sharePost = async (post: PostListPost) => {
    if (typeof window === "undefined") return;

    const url = `${window.location.origin}/app/community/${post.community.slug}/post/${post.id}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }

      setShareFeedback(true);
      window.setTimeout(() => setShareFeedback(false), 2500);
    } catch {
      setShareFeedback(false);
    }
  };

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/app/psychologists");
  };

  const goToProfileEdit = () => {
    router.push("/app/professional/profile/setup");
  };

  const favoritePendingId =
    favoritePsychologist.isPending && typeof favoritePsychologist.variables === "string"
      ? favoritePsychologist.variables
      : unfavoritePsychologist.isPending && typeof unfavoritePsychologist.variables === "string"
        ? unfavoritePsychologist.variables
        : null;
  const isCheckingInactiveOwnProfile =
    profileQuery.isError &&
    Boolean(canInspectInactiveOwnProfile) &&
    ownFreeProfile.profile.isLoading;
  const showInactiveOwnProfileState = Boolean(
    profileQuery.isError &&
      canInspectInactiveOwnProfile &&
      ownFreeProfile.profile.data &&
      !ownFreeProfile.profile.data.activation.active,
  );
  const showInitialLoading = (profileQuery.isLoading && !profile) || isCheckingInactiveOwnProfile;
  const profileErrorMessage =
    profileQuery.isError && !showInactiveOwnProfileState
      ? resolveErrorMessage(profileQuery.error, "Não foi possível carregar o perfil profissional.")
      : null;
  const canEditProfile =
    currentUser?.role === "psicologo" && Boolean(profile?.id) && currentUser.id === profile?.id;
  const canInteractWithPosts = Boolean(currentUser?.id);

  const emptySummary = useMemo<DirectoryReviewSummary>(
    () => ({
      rating_avg: profile?.rating_avg ?? 0,
      rating_count: profile?.rating_count ?? 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }),
    [profile?.rating_avg, profile?.rating_count],
  );

  return (
    <PrivateTemplate
      allowAnonymous
      contentClassName="!pt-0 bg-[#F5F7FA] dark:bg-background sm:!pt-0"
      desktopSidebarDefaultCollapsed
      showNavigation
      showMobileNavigation={false}
    >
      <div className="-mx-5 overflow-x-hidden bg-[#F5F7FA] dark:bg-background">
        <section className="mx-auto grid w-screen max-w-[430px] bg-[#F5F7FA] dark:bg-background sm:max-w-[430px] lg:max-w-[760px]">
          <div className="grid gap-0 pb-32 lg:pb-10">
            {shareFeedback ? (
              <div className="mx-3 pt-3">
                <InlineAlert title="Link copiado" variant="success">
                  Compartilhamento preparado com o link público seguro deste perfil.
                </InlineAlert>
              </div>
            ) : null}

            {showInitialLoading ? (
              <div className="grid min-h-[45vh] place-items-center bg-background">
                <LoadingState label="Carregando perfil profissional" />
              </div>
            ) : null}

            {!showInitialLoading && showInactiveOwnProfileState ? (
              <InactivePublicProfileState
                pendingFields={ownFreeProfile.profile.data?.activation.pending_fields ?? []}
              />
            ) : null}

            {!showInitialLoading && !showInactiveOwnProfileState && profileErrorMessage ? (
              <div className="mx-3 grid gap-4 bg-background px-0 py-8">
                <InlineAlert title="Perfil indisponível" variant="error">
                  {profileErrorMessage}
                </InlineAlert>
                <Button asChild variant="outline">
                  <Link href="/app/psychologists">Voltar para a busca</Link>
                </Button>
              </div>
            ) : null}

            {!showInitialLoading &&
            !showInactiveOwnProfileState &&
            !profileErrorMessage &&
            profile ? (
              <>
                <ProfileHero
                  canFavorite
                  canEditProfile={canEditProfile}
                  favoritePending={favoritePendingId === profile.id}
                  onBack={goBack}
                  onEditProfile={goToProfileEdit}
                  onShareProfile={shareProfile}
                  onToggleFavorite={toggleFavorite}
                  profile={profile}
                />

                <ProfileMobileStickyHeader
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  profile={profile}
                />

                <div className="grid gap-0" id="profile-content">
                  {activeTab === "geral" ? (
                    <AboutTab
                      canInteractPosts={canInteractWithPosts}
                      onTabChange={setActiveTab}
                      onSharePost={sharePost}
                      postsPreview={{
                        isError: posts.isError,
                        isLoading: posts.isLoading,
                        highlightedPublication: posts.data?.highlighted_publication ?? null,
                        posts: posts.data?.data ?? [],
                        total: posts.data?.count ?? 0,
                      }}
                      profile={profile}
                      reviewsPreview={{
                        isError: reviews.isError,
                        isLoading: reviews.isLoading,
                        highlightedReview: reviews.data?.highlighted_review ?? null,
                        reviews: reviews.data?.data ?? [],
                        summary: reviews.data?.summary ?? emptySummary,
                      }}
                    />
                  ) : null}
                  {activeTab === "publicacoes" ? (
                    <PostsTab
                      canInteract={canInteractWithPosts}
                      currentPage={postsPage}
                      error={posts.error}
                      isError={posts.isError}
                      isFetching={posts.isFetching}
                      isLoading={posts.isLoading}
                      onBackToOverview={() => setActiveTab("geral")}
                      onPageChange={setPostsPage}
                      onShare={sharePost}
                      pages={posts.data?.pages ?? 0}
                      posts={posts.data?.data ?? []}
                      summary={posts.data?.summary ?? EMPTY_PUBLICATIONS_SUMMARY}
                      total={posts.data?.count ?? 0}
                    />
                  ) : null}
                  {activeTab === "avaliacoes" ? (
                    <ReviewsTab
                      currentPage={reviewsPage}
                      error={reviews.error}
                      isError={reviews.isError}
                      isFetching={reviews.isFetching}
                      isLoading={reviews.isLoading}
                      onBackToOverview={() => setActiveTab("geral")}
                      onPageChange={setReviewsPage}
                      pages={reviews.data?.pages ?? 0}
                      profileId={profile.id}
                      reviews={reviews.data?.data ?? []}
                      summary={reviews.data?.summary ?? emptySummary}
                    />
                  ) : null}
                </div>

                <WhatsAppCta profile={profile} />
              </>
            ) : null}
          </div>
        </section>
      </div>
    </PrivateTemplate>
  );
};

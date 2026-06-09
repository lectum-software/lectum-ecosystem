"use client";

import {
  ArrowLeft,
  BadgePercent,
  Bookmark,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  Heart,
  HeartHandshake,
  Languages,
  type LucideIcon,
  MapPin,
  MessageSquareText,
  Play,
  Share2,
  ShieldCheck,
  Star,
  ThumbsUp,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useDirectoryPsychologist,
  useDirectoryPsychologistPosts,
  useDirectoryPsychologistReviews,
} from "@/api/callers/directory";
import { usePatient } from "@/api/callers/patient";
import type {
  DirectoryPsychologistProfile,
  DirectoryPsychologistProfilePost,
  DirectoryPsychologistProfileReview,
  DirectoryReviewSummary,
} from "@/api/generator/types/directory";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { formatCrpNumber } from "@/utils/crp";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

const PAGE_LIMIT = 5;
const PROFILE_TABS = ["sobre", "publicacoes", "avaliacoes"] as const;

type ProfileTab = (typeof PROFILE_TABS)[number];

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const tabs: Array<{ label: string; value: ProfileTab; icon: typeof FileText }> = [
  { label: "Sobre", value: "sobre", icon: UsersRound },
  { label: "Publicações", value: "publicacoes", icon: FileText },
  { label: "Avaliações", value: "avaliacoes", icon: Star },
];

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
  adolescentes: "Adolescentes (12-17)",
  adultos: "Adultos (18-59)",
  criancas: "Crianças (até 11)",
  idosos: "Idosos (60+)",
};

const normalizeTab = (value: string | null): ProfileTab => {
  return PROFILE_TABS.includes(value as ProfileTab) ? (value as ProfileTab) : "sobre";
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

const formatRating = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "Sem avaliações";

  return `${(ratingAvg / 100).toFixed(1)} (${ratingCount})`;
};

const formatHeroRating = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "0.0 (0)";

  return formatRating(ratingAvg, ratingCount);
};

const getHonorificName = (profile: DirectoryPsychologistProfile) => {
  if (!profile.verified) return profile.name;

  const gender = profile.gender?.toLowerCase();
  const honorific = gender === "feminino" ? "Dra." : "Dr.";

  return `${honorific} ${profile.name}`;
};

const formatRatingNumber = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "0.0";

  return (ratingAvg / 100).toFixed(1);
};

const formatDate = (value: string | null) => {
  if (!value) return "Data não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const formatCompactDate = (value: string) => {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
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

  if (profile.show_experience_tag !== false && profile.verified && profile.formation_years) {
    tags.push({
      icon: BriefcaseBusiness,
      label: `${profile.formation_years} anos de experiência`,
    });
  }

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
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) => (
  <article className="flex items-start gap-3 rounded-[18px] bg-surface-muted px-4 py-4">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <div className="min-w-0">
      <p className="text-[0.64rem] font-extrabold uppercase tracking-[0.18em] text-subtle">
        {label}
      </p>
      <p className="mt-1 text-sm font-extrabold leading-5 text-foreground">{value}</p>
    </div>
  </article>
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
      className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-muted text-xl font-extrabold text-primary"
      data-profile-avatar="true"
    >
      {avatarSrc ? (
        <Image
          alt={profile.name}
          className="object-cover"
          fill
          priority
          sizes="64px"
          src={avatarSrc}
          unoptimized={avatarIsPublicMedia}
        />
      ) : (
        getInitials(profile.name)
      )}
    </div>
  );
};

const ProfileHero = ({
  canFavorite,
  favoritePending,
  onToggleFavorite,
  profile,
}: {
  canFavorite: boolean;
  favoritePending: boolean;
  onToggleFavorite: () => void;
  profile: DirectoryPsychologistProfile;
}) => {
  const headline = profile.headline || profile.bio;
  const formattedCrp = formatCrpNumber(profile.crp);
  const displayName = getHonorificName(profile);
  const benefitTags = buildBenefitTags(profile);

  return (
    <section className="bg-surface px-5 pb-7 pt-5 sm:px-6 lg:px-8" data-profile-hero="true">
      <div className="flex items-start gap-3">
        <ProfileAvatar profile={profile} />

        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 text-[0.66rem] font-extrabold text-muted">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
            {formatHeroRating(profile.rating_avg, profile.rating_count)}
          </span>
          <h1 className="mt-0.5 flex items-center gap-1.5 text-[1.18rem] font-extrabold leading-5 text-foreground lg:text-2xl">
            <span className="min-w-0 truncate">{displayName}</span>
            {profile.verified ? (
              <VerifiedBadgeIcon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
            ) : null}
          </h1>
          <p className="mt-1 text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-subtle">
            Psicólogo {formattedCrp ? `• CRP ${formattedCrp}` : "• CRP não informado"}
          </p>

          {profile.available_today ? (
            <span
              className="mt-1 inline-flex items-center gap-1.5 text-[0.7rem] font-extrabold text-success"
              data-availability-badge="true"
            >
              <span
                className="h-2 w-2 rounded-full bg-success motion-safe:animate-pulse"
                aria-hidden="true"
              />
              Disponível hoje
            </span>
          ) : null}
        </div>

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
            "grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60",
            profile.favorited && "text-red-500",
          )}
          disabled={favoritePending || !canFavorite}
          onClick={onToggleFavorite}
          title={
            !canFavorite ? "Favoritos disponíveis apenas para usuários autenticados" : undefined
          }
          type="button"
        >
          <Heart className={cn("h-5 w-5", profile.favorited && "fill-current")} />
        </button>
      </div>

      {headline ? (
        <p className="mt-4 text-[0.82rem] leading-5 text-muted">{headline}</p>
      ) : (
        <p className="mt-4 text-[0.82rem] leading-5 text-muted">
          Perfil profissional publicado na Lectum com dados públicos persistidos.
        </p>
      )}

      {benefitTags.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2" data-profile-benefit-tags="true">
          {benefitTags.map((tag) => {
            const Icon = tag.icon;

            return (
              <span
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[0.68rem] font-bold text-muted"
                key={tag.label}
              >
                <Icon className="h-3.5 w-3.5 text-subtle" aria-hidden="true" />
                {tag.label}
              </span>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};
const ProfileTabs = ({
  activeTab,
  onTabChange,
}: {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}) => {
  return (
    <nav
      aria-label="Seções do perfil profissional"
      className="grid grid-cols-3 border-b border-border bg-surface"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.value === activeTab;

        return (
          <button
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 items-center justify-center gap-1 border-b-2 px-1.5 text-[0.68rem] font-extrabold transition sm:text-xs",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-primary",
            )}
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            type="button"
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
};

const PresentationVideo = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  const [playing, setPlaying] = useState(false);
  const videoSrc = resolvePublicMediaUrl(profile.video_url);
  const videoCoverSrc = resolvePublicMediaUrl(profile.video_cover_url);
  const videoCoverIsPublicMedia = isPublicMediaUrl(profile.video_cover_url);

  if (!videoSrc) return null;

  return (
    <div
      className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-surface-muted"
      data-presentation-video="true"
    >
      {playing ? (
        <>
          {/* biome-ignore lint/a11y/useMediaCaption: vídeos enviados pelos profissionais ainda não possuem trilha de legenda no recorte atual. */}
          <video
            aria-label={`Vídeo de apresentação de ${profile.name}`}
            autoPlay
            className="h-full w-full bg-black object-cover"
            controls
            onEnded={() => setPlaying(false)}
            playsInline
            poster={videoCoverSrc || undefined}
            preload="metadata"
            src={videoSrc}
          >
            Seu navegador não suporta a reprodução de vídeo.
          </video>
          <span className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-foreground/75 px-3 py-1.5 text-xs font-extrabold text-white">
            Vídeo de apresentação
          </span>
        </>
      ) : (
        <div className="relative h-full w-full overflow-hidden bg-surface-muted text-white">
          {videoCoverSrc ? (
            <Image
              alt=""
              aria-hidden="true"
              className="object-cover"
              fill
              sizes="(min-width: 768px) 720px, calc(100vw - 32px)"
              src={videoCoverSrc}
              unoptimized={videoCoverIsPublicMedia}
            />
          ) : (
            <video
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              muted
              playsInline
              preload="auto"
              src={videoSrc}
              tabIndex={-1}
            />
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-foreground/65 via-foreground/10 to-transparent" />
          <button
            aria-label={`Reproduzir vídeo de apresentação de ${profile.name}`}
            className="absolute inset-0 grid place-items-center text-white transition hover:bg-foreground/10"
            onClick={() => setPlaying(true)}
            type="button"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-white/90 text-primary shadow-sm transition hover:scale-105">
              <Play className="ml-1 h-8 w-8 fill-current" aria-hidden="true" />
            </span>
          </button>
          <span className="absolute bottom-4 left-4 rounded-full bg-foreground/75 px-3 py-1.5 text-xs font-extrabold text-white">
            Vídeo de apresentação
          </span>
        </div>
      )}
    </div>
  );
};

const ExpandableBio = ({ text }: { text: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const element = textRef.current;
      setCanExpand(Boolean(element && element.scrollHeight > element.clientHeight + 2));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="grid gap-2">
      <p
        className={cn("text-[0.86rem] leading-6 text-muted", !expanded && "line-clamp-4")}
        ref={textRef}
      >
        {text}
      </p>
      {canExpand ? (
        <button
          className="w-fit text-[0.78rem] font-extrabold text-primary transition hover:text-primary/80"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? "Ver menos" : "Ver mais"}
        </button>
      ) : null}
    </div>
  );
};

const FormationSection = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  const formations = profile.academic_formations ?? [];

  return (
    <section className="grid gap-3 border-t border-border bg-surface px-5 py-6 sm:px-6 lg:px-8">
      <h2 className="text-base font-extrabold text-foreground">Formação & Títulos</h2>
      {formations.length > 0 ? (
        <div className="grid gap-3">
          {formations.map((formation, index) => {
            const institutionLine = formatList(
              [formation.institution || "", formation.graduation_year || ""],
              "Instituição e data não informadas",
            );

            return (
              <article
                className="flex items-start gap-3 rounded-[18px] bg-surface-muted px-4 py-4"
                key={`${formation.title || "formacao"}-${formation.institution || index}`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                  <GraduationCap className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold leading-5 text-foreground">
                    {formation.title || "Título não informado"}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold leading-5 text-muted">
                    {institutionLine}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted">
          Nenhuma formação pública foi cadastrada para este perfil.
        </p>
      )}
    </section>
  );
};

const AboutTab = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  const specialtyText = formatList(
    profile.specialties.map((item) => item.name),
    "Nenhuma especialidade pública cadastrada.",
  );
  const serviceText = formatList(
    profile.services.map((item) => item.name),
    "Nenhum serviço público cadastrado.",
  );
  const approachText = formatList(
    profile.approaches.map((item) => item.name),
    "Nenhuma abordagem pública cadastrada.",
  );
  const targetText = formatList(
    (profile.target_audience ?? []).map(translateTargetAudience),
    "Nenhum público atendido cadastrado.",
  );
  const languageText = formatList(
    profile.languages.map(translateLanguage),
    "Nenhum idioma cadastrado.",
  );

  const bioText =
    profile.bio ||
    "Este profissional ainda não informou uma biografia pública. Assim que houver dados persistidos, eles aparecerão aqui sem usar conteúdo fictício.";

  return (
    <div className="bg-surface">
      <div className="grid gap-5 px-5 py-5 sm:px-6 lg:px-8">
        <PresentationVideo profile={profile} />

        <ExpandableBio text={bioText} />

        <div className="grid gap-3">
          <ProfileInfoCard icon={Brain} label="Especialidades" value={specialtyText} />
          <ProfileInfoCard icon={MessageSquareText} label="Abordagens" value={approachText} />
        </div>
      </div>

      <section className="grid gap-3 border-t border-border bg-surface px-5 py-6 sm:px-6 lg:px-8">
        <h2 className="text-base font-extrabold text-foreground">Atendimento</h2>
        <div className="grid gap-3">
          <ProfileInfoCard
            icon={MapPin}
            label="Modalidades"
            value={formatAttendanceLabel(profile)}
          />
          <ProfileInfoCard icon={BriefcaseBusiness} label="Serviços" value={serviceText} />
          <ProfileInfoCard icon={UsersRound} label="Público atendido" value={targetText} />
          <ProfileInfoCard icon={Languages} label="Idiomas" value={languageText} />
        </div>
      </section>

      <FormationSection profile={profile} />

      <section className="border-t border-border bg-surface px-5 pb-24 pt-6 sm:px-6 lg:px-8">
        <div className="flex items-start gap-3 rounded-[18px] border border-primary/20 bg-primary-soft px-4 py-4 text-primary">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-semibold leading-5 text-foreground">
            {profile.whatsapp_available
              ? "Para consultar agenda, valores e demais informações, chame o psicólogo no WhatsApp."
              : "Este perfil ainda não possui WhatsApp disponível. O botão será exibido quando o profissional informar um número válido."}
          </p>
        </div>
      </section>
    </div>
  );
};
const PostCard = ({ post }: { post: DirectoryPsychologistProfilePost }) => {
  return (
    <article className="rounded-[20px] border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3 text-xs font-semibold text-muted">
        <span className="inline-flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-subtle" aria-hidden="true" />
          Postado em <strong className="text-foreground">{post.community.name}</strong>
        </span>
        <span>{formatCompactDate(post.created_at)}</span>
      </div>

      <h2 className="mt-4 text-lg font-extrabold leading-6 text-foreground">{post.title}</h2>
      <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted">{post.content}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm font-semibold text-muted">
        <span className="inline-flex items-center gap-1.5">
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
          {post.upvotes_count}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageSquareText className="h-4 w-4" aria-hidden="true" />
          {post.replies_count}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Bookmark className="h-4 w-4" aria-hidden="true" />
          {post.saves_count}
        </span>
      </div>
    </article>
  );
};

const PostsTab = ({
  currentPage,
  error,
  isError,
  isFetching,
  isLoading,
  onPageChange,
  pages,
  posts,
  total,
}: {
  currentPage: number;
  error: unknown;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  pages: number;
  posts: DirectoryPsychologistProfilePost[];
  total: number;
}) => {
  return (
    <div className="grid gap-4 border-x border-b border-border bg-surface px-4 py-5 sm:rounded-b-2xl sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-muted p-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-subtle">
            Publicações
          </p>
          <h2 className="text-2xl font-extrabold text-foreground">{total}</h2>
        </div>
        {isFetching && !isLoading ? <LoadingState label="Atualizando" /> : null}
      </div>

      {isError ? (
        <InlineAlert title="Não foi possível carregar publicações" variant="error">
          {resolveErrorMessage(error, "Não foi possível carregar as publicações deste perfil.")}
        </InlineAlert>
      ) : null}

      {isLoading ? (
        <div className="grid min-h-[30vh] place-items-center rounded-2xl border border-border bg-surface-muted">
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
        <div className="grid gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
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

const ReviewSummaryCard = ({ summary }: { summary: DirectoryReviewSummary }) => {
  const max = Math.max(1, summary.rating_count);

  return (
    <section className="rounded-[20px] border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-5xl font-extrabold tracking-tight text-foreground">
            {formatRatingNumber(summary.rating_avg, summary.rating_count)}
          </p>
          <div className="mt-2">
            <StarRating rating={summary.rating_avg / 100} />
          </div>
          <p className="mt-2 text-sm font-semibold text-muted">
            Total de {summary.rating_count} avaliações
          </p>
        </div>
        <Button disabled type="button" variant="ghost">
          Avaliar em breve
        </Button>
      </div>

      <div className="mt-5 grid gap-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = summary.distribution[rating as 1 | 2 | 3 | 4 | 5] ?? 0;
          const percent = Math.round((count / max) * 100);

          return (
            <div className="grid grid-cols-[18px_1fr_42px] items-center gap-2" key={rating}>
              <span className="text-xs font-bold text-muted">{rating}</span>
              <span className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="text-right text-xs font-bold text-muted">{percent}%</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const ReviewCard = ({ review }: { review: DirectoryPsychologistProfileReview }) => {
  return (
    <article className="rounded-[20px] border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-extrabold text-primary">
          {review.author.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-foreground">{review.author.name}</h2>
              <p className="text-xs font-semibold text-muted">{formatDate(review.created_at)}</p>
            </div>
            <StarRating rating={review.rating} />
          </div>

          {review.comment ? (
            <p className="mt-4 text-sm leading-6 text-muted">“{review.comment}”</p>
          ) : (
            <p className="mt-4 text-sm leading-6 text-muted">
              Avaliação publicada sem comentário textual.
            </p>
          )}

          {review.response ? (
            <div className="mt-4 border-l-2 border-primary bg-surface-muted px-4 py-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
                Resposta do profissional
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">“{review.response}”</p>
              {review.responded_at ? (
                <p className="mt-2 text-xs font-semibold text-muted">
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
  onPageChange,
  pages,
  reviews,
  summary,
}: {
  currentPage: number;
  error: unknown;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  pages: number;
  reviews: DirectoryPsychologistProfileReview[];
  summary: DirectoryReviewSummary;
}) => {
  return (
    <div className="grid gap-4 border-x border-b border-border bg-surface px-4 py-5 sm:rounded-b-2xl sm:px-6 lg:px-8">
      <ReviewSummaryCard summary={summary} />

      {isError ? (
        <InlineAlert title="Não foi possível carregar avaliações" variant="error">
          {resolveErrorMessage(error, "Não foi possível carregar as avaliações deste perfil.")}
        </InlineAlert>
      ) : null}

      {isLoading ? (
        <div className="grid min-h-[30vh] place-items-center rounded-2xl border border-border bg-surface-muted">
          <LoadingState label="Carregando avaliações" />
        </div>
      ) : null}

      {!isLoading && !isError && reviews.length === 0 ? (
        <EmptyState
          description="Este profissional ainda não possui avaliações publicadas."
          icon={Star}
          title="Nenhuma avaliação pública"
        />
      ) : null}

      {!isLoading && !isError && reviews.length > 0 ? (
        <div className="grid gap-4">
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
    <div className="sticky bottom-4 z-20 px-4 pb-2 sm:px-0 lg:bottom-6">
      <Button
        asChild
        className="h-14 w-full rounded-2xl bg-[#22C55E] text-base font-extrabold hover:bg-[#22C55E]/90"
      >
        <a href={profile.whatsapp_url} rel="noreferrer" target="_blank">
          <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
          Chamar no WhatsApp
        </a>
      </Button>
    </div>
  );
};

export const PsychologistProfileLogic = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [shareFeedback, setShareFeedback] = useState(false);
  const currentUser = useAppSelector((state) => state.user);
  const canFavoritePsychologists = Boolean(currentUser?.id);
  const id = params.id;

  const urlParams = useMemo(() => new URLSearchParams(searchParamsString), [searchParamsString]);
  const activeTab = useMemo(() => normalizeTab(urlParams.get("tab")), [urlParams]);
  const postsPage = useMemo(() => getPageFromParams(urlParams, "postsPage"), [urlParams]);
  const reviewsPage = useMemo(() => getPageFromParams(urlParams, "reviewsPage"), [urlParams]);
  const postsQuery = useMemo(() => ({ page: postsPage, limit: PAGE_LIMIT }), [postsPage]);
  const reviewsQuery = useMemo(() => ({ page: reviewsPage, limit: PAGE_LIMIT }), [reviewsPage]);

  const profileQuery = useDirectoryPsychologist(id);
  const profile = profileQuery.data;
  const posts = useDirectoryPsychologistPosts(
    id,
    postsQuery,
    activeTab === "publicacoes" && Boolean(profile),
  );
  const reviews = useDirectoryPsychologistReviews(
    id,
    reviewsQuery,
    activeTab === "avaliacoes" && Boolean(profile),
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

  const setActiveTab = (tab: ProfileTab) => {
    navigateWithParams((next) => {
      if (tab === "sobre") next.delete("tab");
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

  const toggleFavorite = () => {
    if (!canFavoritePsychologists) return;
    if (!profile) return;

    if (profile.favorited) {
      unfavoritePsychologist.mutate(profile.id);
      return;
    }

    favoritePsychologist.mutate(profile.id);
  };

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

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/app/psychologists");
  };

  const favoritePendingId =
    favoritePsychologist.isPending && typeof favoritePsychologist.variables === "string"
      ? favoritePsychologist.variables
      : unfavoritePsychologist.isPending && typeof unfavoritePsychologist.variables === "string"
        ? unfavoritePsychologist.variables
        : null;
  const showInitialLoading = profileQuery.isLoading && !profile;
  const profileErrorMessage = profileQuery.isError
    ? resolveErrorMessage(profileQuery.error, "Não foi possível carregar o perfil profissional.")
    : null;

  const emptySummary = useMemo<DirectoryReviewSummary>(
    () => ({
      rating_avg: profile?.rating_avg ?? 0,
      rating_count: profile?.rating_count ?? 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }),
    [profile?.rating_avg, profile?.rating_count],
  );

  return (
    <PrivateTemplate allowAnonymous showNavigation={false}>
      <section className="mx-auto -my-6 grid w-full max-w-[390px] gap-0 overflow-hidden bg-background sm:my-0 sm:rounded-[24px] sm:border sm:border-border lg:max-w-[760px]">
        <div>
          <header
            className="border-b border-border bg-surface px-4 pt-3 lg:px-8"
            data-profile-header="true"
          >
            <div className="flex min-h-12 items-center justify-between gap-3 pb-3">
              <button
                aria-label="Voltar para a tela anterior"
                className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
                onClick={goBack}
                type="button"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0 text-center">
                <h1 className="truncate text-base font-extrabold text-foreground">
                  Perfil Profissional
                </h1>
              </div>
              <button
                aria-label="Compartilhar perfil"
                className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
                onClick={shareProfile}
                type="button"
              >
                <Share2 className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </header>
        </div>

        <div className="grid gap-0">
          {shareFeedback ? (
            <InlineAlert className="mt-4" title="Link copiado" variant="success">
              Compartilhamento preparado com o link público seguro deste perfil.
            </InlineAlert>
          ) : null}

          {showInitialLoading ? (
            <div className="grid min-h-[45vh] place-items-center bg-surface sm:rounded-b-[28px] sm:border">
              <LoadingState label="Carregando perfil profissional" />
            </div>
          ) : null}

          {!showInitialLoading && profileErrorMessage ? (
            <div className="grid gap-4 bg-surface px-4 py-8 sm:rounded-b-[28px] sm:border sm:px-6">
              <InlineAlert title="Perfil indisponível" variant="error">
                {profileErrorMessage}
              </InlineAlert>
              <Button asChild variant="outline">
                <Link href="/app/psychologists">Voltar para a busca</Link>
              </Button>
            </div>
          ) : null}

          {!showInitialLoading && !profileErrorMessage && profile ? (
            <>
              <ProfileHero
                canFavorite={canFavoritePsychologists}
                favoritePending={favoritePendingId === profile.id}
                onToggleFavorite={toggleFavorite}
                profile={profile}
              />

              <div className="grid gap-0">
                <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
                {activeTab === "sobre" ? <AboutTab profile={profile} /> : null}
                {activeTab === "publicacoes" ? (
                  <PostsTab
                    currentPage={postsPage}
                    error={posts.error}
                    isError={posts.isError}
                    isFetching={posts.isFetching}
                    isLoading={posts.isLoading}
                    onPageChange={setPostsPage}
                    pages={posts.data?.pages ?? 0}
                    posts={posts.data?.data ?? []}
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
                    onPageChange={setReviewsPage}
                    pages={reviews.data?.pages ?? 0}
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
    </PrivateTemplate>
  );
};

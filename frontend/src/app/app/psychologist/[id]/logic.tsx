"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  Heart,
  Languages,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Play,
  Share2,
  ShieldCheck,
  Star,
  ThumbsUp,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

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

const isGoogleAvatar = (avatar?: string | null) => {
  return Boolean(avatar?.startsWith("https://lh3.googleusercontent.com/"));
};

const formatRating = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "Sem avaliações";

  return `${(ratingAvg / 100).toFixed(1)} (${ratingCount})`;
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

const TagList = ({ empty, items }: { empty: string; items: string[] }) => {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-muted">{empty}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-extrabold text-primary"
          key={item}
        >
          {item}
        </span>
      ))}
    </div>
  );
};

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
  return (
    <div className="relative grid h-[92px] w-[92px] shrink-0 place-items-center overflow-hidden rounded-[28px] bg-primary-soft text-3xl font-extrabold text-primary shadow-[var(--lectum-shadow-soft)]">
      {isGoogleAvatar(profile.avatar) ? (
        <Image
          alt={profile.name}
          className="object-cover"
          fill
          priority
          sizes="92px"
          src={profile.avatar as string}
        />
      ) : (
        getInitials(profile.name)
      )}
      <span
        className="absolute bottom-1.5 right-1.5 h-5 w-5 rounded-full border-4 border-surface bg-success"
        aria-label="Profissional disponível"
        role="img"
      />
    </div>
  );
};

const ProfileHero = ({
  favoritePending,
  followPending,
  onToggleFavorite,
  onToggleFollow,
  profile,
}: {
  favoritePending: boolean;
  followPending: boolean;
  onToggleFavorite: () => void;
  onToggleFollow: () => void;
  profile: DirectoryPsychologistProfile;
}) => {
  const primarySpecialty = profile.specialties[0]?.name;
  const headline = profile.headline || profile.bio;

  return (
    <section className="border-b border-border bg-surface px-4 pb-5 pt-6 sm:rounded-b-[28px] sm:border sm:px-6 lg:px-8">
      <div className="flex gap-4">
        <div className="relative">
          <ProfileAvatar profile={profile} />
          <button
            aria-label={
              profile.favorited
                ? `Remover ${profile.name} dos favoritos`
                : `Favoritar ${profile.name}`
            }
            aria-pressed={profile.favorited}
            className={cn(
              "absolute -right-2 -top-2 grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted shadow-[var(--lectum-shadow-soft)] transition hover:border-primary/40 hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-60",
              profile.favorited && "border-primary/30 bg-primary-soft text-primary",
            )}
            disabled={favoritePending}
            onClick={onToggleFavorite}
            type="button"
          >
            <Heart className={cn("h-5 w-5", profile.favorited && "fill-current")} />
          </button>
        </div>

        <div className="min-w-0 flex-1 pt-2">
          <h1 className="flex items-center gap-2 text-[1.55rem] font-extrabold leading-tight text-foreground lg:text-3xl">
            <span className="min-w-0 truncate">{profile.name}</span>
            {profile.verified ? (
              <BadgeCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            ) : null}
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted">
            Psicóloga(o) {profile.crp ? `• CRP: ${profile.crp}` : "• CRP não informado"}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-extrabold text-success">
              <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
              Disponível hoje
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-extrabold text-primary">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
              {formatRating(profile.rating_avg, profile.rating_count)}
            </span>
          </div>
        </div>
      </div>

      {headline ? (
        <p className="mt-5 text-[0.95rem] leading-7 text-muted">{headline}</p>
      ) : (
        <p className="mt-5 text-[0.95rem] leading-7 text-muted">
          Perfil profissional publicado na Lectum com dados públicos persistidos.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Dados públicos seguros
        </span>
        {primarySpecialty ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {primarySpecialty}
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        <button
          aria-label={
            profile.followed ? `Deixar de seguir ${profile.name}` : `Seguir ${profile.name}`
          }
          aria-pressed={profile.followed}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface-muted px-4 text-sm font-extrabold text-muted transition hover:border-primary/40 hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-60",
            profile.followed && "border-primary/30 bg-primary-soft text-primary",
          )}
          disabled={followPending}
          onClick={onToggleFollow}
          type="button"
        >
          {profile.followed ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <UserPlus className="h-4 w-4" aria-hidden="true" />
          )}
          {profile.followed ? "Seguindo" : "Seguir"}
        </button>

        <Button asChild className="h-11 rounded-full" variant="outline">
          <Link href="/app/psychologists">
            <UsersRound className="h-4 w-4" aria-hidden="true" />
            Buscar mais
          </Link>
        </Button>
      </div>
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
      className="grid grid-cols-3 border-b border-border bg-surface sm:rounded-t-[28px] sm:border sm:border-b-0"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.value === activeTab;

        return (
          <button
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 items-center justify-center gap-1.5 border-b-2 px-2 text-xs font-extrabold transition sm:text-sm",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-primary",
            )}
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            type="button"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
};

const StatGrid = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-2xl border border-border bg-surface p-3 text-center shadow-[var(--lectum-shadow-soft)]">
        <p className="text-[0.64rem] font-extrabold uppercase tracking-[0.18em] text-subtle">
          Modalidade
        </p>
        <p className="mt-1 text-sm font-extrabold text-foreground">
          {profile.modality ? modalityLabel[profile.modality] || profile.modality : "Não informada"}
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-3 text-center shadow-[var(--lectum-shadow-soft)]">
        <p className="text-[0.64rem] font-extrabold uppercase tracking-[0.18em] text-subtle">
          Avaliação
        </p>
        <p className="mt-1 text-lg font-extrabold text-foreground">
          {formatRatingNumber(profile.rating_avg, profile.rating_count)}
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-3 text-center shadow-[var(--lectum-shadow-soft)]">
        <p className="text-[0.64rem] font-extrabold uppercase tracking-[0.18em] text-subtle">
          Reviews
        </p>
        <p className="mt-1 text-lg font-extrabold text-foreground">{profile.rating_count}</p>
      </div>
    </div>
  );
};

const AboutTab = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  return (
    <div className="grid gap-6 bg-surface px-4 py-5 sm:rounded-b-[28px] sm:border sm:px-6 lg:px-8">
      {profile.video_url ? (
        <a
          className="group relative grid min-h-[190px] place-items-center overflow-hidden rounded-[22px] border border-border bg-surface-muted text-primary shadow-[var(--lectum-shadow-soft)]"
          href={profile.video_url}
          rel="noreferrer"
          target="_blank"
        >
          <span className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary-soft to-surface-muted" />
          <span className="relative grid h-16 w-16 place-items-center rounded-full bg-surface/90 text-primary shadow-[var(--lectum-shadow)] transition group-hover:scale-105">
            <Play className="h-8 w-8 fill-current" aria-hidden="true" />
          </span>
          <span className="absolute bottom-4 left-4 rounded-full bg-foreground/75 px-3 py-1.5 text-xs font-extrabold text-white">
            Vídeo de apresentação
          </span>
        </a>
      ) : null}

      <StatGrid profile={profile} />

      <section className="grid gap-3">
        <h2 className="text-lg font-extrabold text-foreground">Sobre</h2>
        <p className="text-[0.95rem] leading-7 text-muted">
          {profile.bio ||
            "Este profissional ainda não informou uma biografia pública. Assim que houver dados persistidos, eles aparecerão aqui sem usar conteúdo fictício."}
        </p>
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-extrabold text-foreground">Atendimento</h2>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-muted p-4">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-foreground">
              {profile.modality
                ? modalityLabel[profile.modality] || profile.modality
                : "Modalidade não informada"}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-muted">
              Agenda, valores e endereço serão tratados no fluxo de contato.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-extrabold text-foreground">Especialidades</h2>
        <TagList
          empty="Nenhuma especialidade pública foi cadastrada para este perfil."
          items={profile.specialties.map((item) => item.name)}
        />
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-extrabold text-foreground">Serviços</h2>
        <TagList
          empty="Nenhum serviço público foi cadastrado para este perfil."
          items={profile.services.map((item) => item.name)}
        />
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-extrabold text-foreground">Abordagens</h2>
        <TagList
          empty="Nenhuma abordagem pública foi cadastrada para este perfil."
          items={profile.approaches.map((item) => item.name)}
        />
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-extrabold text-foreground">Idiomas</h2>
        <TagList
          empty="Nenhum idioma público foi cadastrado para este perfil."
          items={profile.languages.map(translateLanguage)}
        />
      </section>

      <InlineAlert title="Contato seguro" variant={profile.whatsapp_available ? "info" : "warning"}>
        {profile.whatsapp_available
          ? "Para consultar agenda, valores e demais informações, avance pelo fluxo de contato por WhatsApp. O número não é exposto nesta tela pública."
          : "Este perfil ainda não possui WhatsApp verificado. O contato por WhatsApp será liberado quando houver verificação real."}
      </InlineAlert>
    </div>
  );
};

const PostCard = ({ post }: { post: DirectoryPsychologistProfilePost }) => {
  return (
    <article className="rounded-[20px] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
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
    <div className="grid gap-4 bg-surface px-4 py-5 sm:rounded-b-[28px] sm:border sm:px-6 lg:px-8">
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
    <section className="rounded-[20px] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
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
    <article className="rounded-[20px] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
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
    <div className="grid gap-4 bg-surface px-4 py-5 sm:rounded-b-[28px] sm:border sm:px-6 lg:px-8">
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
  if (!profile.whatsapp_available) {
    return null;
  }

  return (
    <div className="sticky bottom-20 z-20 px-4 pb-2 sm:bottom-24 sm:px-0 lg:bottom-6">
      <Button
        asChild
        className="h-14 w-full rounded-2xl bg-success text-base font-extrabold hover:bg-success/90"
      >
        <Link href={`/app/psychologist/${profile.id}/contact`}>
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          Chamar no WhatsApp
        </Link>
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
  const { favoritePsychologist, followPsychologist, unfavoritePsychologist, unfollowPsychologist } =
    usePatient({ enableProfile: false });

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
    if (!profile) return;

    if (profile.favorited) {
      unfavoritePsychologist.mutate(profile.id);
      return;
    }

    favoritePsychologist.mutate(profile.id);
  };

  const toggleFollow = () => {
    if (!profile) return;

    if (profile.followed) {
      unfollowPsychologist.mutate(profile.id);
      return;
    }

    followPsychologist.mutate(profile.id);
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

  const favoritePendingId =
    favoritePsychologist.isPending && typeof favoritePsychologist.variables === "string"
      ? favoritePsychologist.variables
      : unfavoritePsychologist.isPending && typeof unfavoritePsychologist.variables === "string"
        ? unfavoritePsychologist.variables
        : null;
  const followPendingId =
    followPsychologist.isPending && typeof followPsychologist.variables === "string"
      ? followPsychologist.variables
      : unfollowPsychologist.isPending && typeof unfollowPsychologist.variables === "string"
        ? unfollowPsychologist.variables
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
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[390px] gap-0 bg-background sm:max-w-[430px] lg:max-w-6xl lg:grid-cols-[minmax(0,760px)_minmax(300px,1fr)] lg:items-start lg:gap-5 lg:bg-transparent">
        <div className="lg:col-span-2">
          <header className="-mx-5 -mt-6 border-b border-border bg-surface px-4 pb-0 pt-4 sm:mx-0 sm:mt-0 sm:rounded-t-[28px] sm:border sm:pb-0 lg:px-8 lg:pt-6">
            <div className="flex min-h-12 items-center justify-between gap-3 pb-4">
              <Link
                aria-label="Voltar para psicólogos"
                className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
                href="/app/psychologists"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Link>
              <div className="min-w-0 text-center">
                <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-subtle">
                  Perfil profissional
                </p>
                <h1 className="truncate text-lg font-extrabold text-foreground">
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
            <div className="-mx-4 bg-primary px-4 py-1.5 text-center text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-white sm:-mx-6 lg:-mx-8">
              Desconto na 1ª sessão • aceita convênios • valor social quando informado
            </div>
          </header>
        </div>

        <div className="grid gap-0 lg:gap-5">
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
                favoritePending={favoritePendingId === profile.id}
                followPending={followPendingId === profile.id}
                onToggleFavorite={toggleFavorite}
                onToggleFollow={toggleFollow}
                profile={profile}
              />

              <div className="mt-4 grid gap-0 lg:mt-0">
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

        {!showInitialLoading && !profileErrorMessage && profile ? (
          <aside className="mt-5 hidden rounded-[28px] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)] lg:sticky lg:top-6 lg:mt-0 lg:block">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-foreground">Contato e agenda</p>
                <p className="text-xs leading-5 text-muted">
                  WhatsApp só é liberado no fluxo dedicado e com número verificado.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-border bg-surface-muted p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-subtle">
                  Segurança
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Esta tela não expõe e-mail, CPF, telefone, tokens ou documentos do profissional.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-surface-muted p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-subtle">
                  Idiomas
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-muted">
                  <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
                  {profile.languages.length > 0
                    ? profile.languages.map(translateLanguage).join(", ")
                    : "Não informados"}
                </p>
              </div>
            </div>
          </aside>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};

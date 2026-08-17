"use client";

import { ArrowLeft, type LucideIcon, Star, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useRef } from "react";
import type { DirectoryCatalogItem } from "@/api/generator/types/directory";
import type { FreeProfessionalProfileActivationPendingField } from "@/api/generator/types/free-profile";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";

import { PROFILE_CARD_SURFACE, PROFILE_SUBTLE_SURFACE } from "../modules/support";

export const InactivePublicProfileState = ({
  pendingFields,
}: {
  pendingFields: FreeProfessionalProfileActivationPendingField[];
}) => {
  const hasPendingFields = pendingFields.length > 0;

  return (
    <div className="grid min-h-[calc(100vh-160px)] place-items-center bg-surface-muted px-3 py-8 dark:bg-background">
      <article className="w-full max-w-[430px] rounded-[30px] border border-border bg-surface p-5 text-center shadow-lectum-soft dark:border-border dark:bg-surface sm:p-6">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-danger/10 text-danger shadow-lectum-soft">
          <TriangleAlert className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
          Ativação do perfil
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-foreground dark:text-foreground">
          Seu perfil ainda não está ativo
        </h1>
        <p className="mx-auto mt-3 max-w-[350px] text-sm leading-6 text-muted dark:text-muted">
          {hasPendingFields
            ? "Para exibir seu perfil publicamente na Lectum, complete as informações obrigatórias do seu perfil profissional."
            : "Seu perfil não está visível porque você desativou a visibilidade. Ative novamente para o perfil voltar a ficar visível para pacientes."}
        </p>

        {hasPendingFields ? (
          <div className="mt-5 rounded-[22px] border border-border bg-surface-muted p-4 text-left dark:border-border dark:bg-surface-muted">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted dark:text-foreground">
              Pendências para publicação
            </p>
            <ul className="mt-3 grid gap-2.5">
              {pendingFields.map((field) => (
                <li
                  className="flex min-w-0 items-start gap-2.5 text-sm font-semibold leading-5 text-muted dark:text-muted"
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
            className="h-12 rounded-full bg-primary text-sm font-extrabold text-primary-foreground shadow-lectum-soft hover:bg-primary/90"
          >
            <Link href="/app/profissional/perfil/configurar">Completar perfil</Link>
          </Button>
          <Button asChild className="h-11 rounded-full" variant="outline">
            <Link href="/app/perfil">Voltar ao perfil</Link>
          </Button>
        </div>
      </article>
    </div>
  );
};

export const StarRating = ({ rating }: { rating: number }) => {
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

export const ProfileInfoCard = ({
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
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-primary-hover/75">
        <Icon className="h-[15px] w-[15px]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9.75px] font-semibold uppercase leading-none tracking-[0.06em] text-muted">
          {label}
        </p>
        <p
          className={cn(
            "mt-1.5 break-words text-[13.25px] font-bold leading-[1.42] tracking-[-0.01em] text-foreground",
            compact ? "line-clamp-3" : "line-clamp-4",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  </article>
);

export const ProfileSectionCard = ({
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
        <h2 className="text-[1.08rem] font-extrabold leading-tight tracking-[-0.025em] text-foreground dark:text-foreground">
          {title}
        </h2>
        {titleAccessory}
      </div>
      {action}
    </div>
    {children}
  </section>
);

export const ProfileCountChip = ({
  pluralLabel,
  singularLabel,
  total,
}: {
  pluralLabel: string;
  singularLabel: string;
  total: number;
}) => (
  <span
    className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted px-2 text-[11px] font-extrabold leading-none text-primary-hover shadow-lectum-soft"
    title={`${total} ${total === 1 ? singularLabel : pluralLabel}`}
  >
    {total.toLocaleString("pt-BR")}
  </span>
);

export const PublicationCountChip = ({ total }: { total: number }) => (
  <ProfileCountChip pluralLabel="publicações" singularLabel="publicação" total={total} />
);

export const ProfileTabHeaderCard = ({
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
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-lectum-soft transition hover:-translate-x-0.5 hover:border-border hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 dark:border-border dark:bg-surface dark:text-foreground"
        onClick={onBack}
        type="button"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate text-[15px] font-extrabold tracking-[-0.02em] text-foreground">
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

export const ProfileChipList = ({
  emptyMessage,
  items,
}: {
  emptyMessage: string;
  items: DirectoryCatalogItem[];
}) => {
  if (items.length === 0) {
    return <p className="mt-2.5 text-[13px] leading-[1.6] text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-muted px-3 text-[12px] font-semibold leading-none text-foreground"
          key={item.id}
        >
          {item.name}
        </span>
      ))}
    </div>
  );
};

export const ViewAllChipButton = ({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) => (
  <button
    className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface px-3.5 text-[13px] font-medium text-primary-hover transition hover:border-border hover:bg-surface-muted hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
    onClick={onClick}
    style={{ fontSize: 13 }}
    type="button"
  >
    {children}
  </button>
);

export const SectionChipLink = ({ children, href }: { children: ReactNode; href: string }) => (
  <Link
    className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface px-3.5 text-[13px] font-medium text-primary-hover no-underline transition hover:border-border hover:bg-surface-muted hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
    href={href}
    style={{ fontSize: 13 }}
  >
    {children}
  </Link>
);

export const InfiniteProfileListLoader = ({
  hasNextPage,
  isLoading,
  label,
  onLoadMore,
}: {
  hasNextPage: boolean;
  isLoading: boolean;
  label: string;
  onLoadMore: () => void;
}) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasNextPage || isLoading) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "520px 0px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasNextPage, isLoading, onLoadMore]);

  if (!hasNextPage && !isLoading) return null;

  return (
    <div className="grid min-h-10 place-items-center py-2" ref={sentinelRef}>
      {isLoading ? (
        <LoadingState label={label} />
      ) : (
        <span className="sr-only">Carregar mais resultados automaticamente</span>
      )}
    </div>
  );
};

"use client";

import { ExternalLink, Eye, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { PsychologistsListItem } from "@/api/req/psychologists";
import { VerifiedBadgeIcon } from "@/components/admin-icons";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import { toPublicFrontendHref } from "@/lib/public-frontend-url";
import { cn } from "@/lib/utils";
import { formatRegistrationDate, LOADING_ROWS } from "../modules/list-support";
import { Avatar } from "./filters";

export const statusTextClassName = {
  active: "text-success",
  courtesy: "text-muted",
  danger: "text-danger",
  free: "text-muted",
  info: "text-primary",
  inactive: "text-muted",
  pending: "text-warning",
  professional: "text-muted",
  warning: "text-warning",
} as const;

export const StatusText = ({
  children,
  tone,
}: {
  children: ReactNode;
  tone: keyof typeof statusTextClassName;
}) => (
  <span className={cn("inline text-sm font-medium leading-5", statusTextClassName[tone])}>
    {children}
  </span>
);

export const resolvePlanLabel = (item: PsychologistsListItem) => {
  const value = `${item.plan_slug ?? ""} ${item.plan_name ?? ""}`.toLowerCase();

  if (item.registry_verification.source === "admin_grant")
    return { label: "Cortesia", tone: "courtesy" as const };
  if (value.includes("cortesia")) return { label: "Cortesia", tone: "courtesy" as const };
  if (value.includes("gratuito") || !item.plan_name)
    return { label: "Gratuito", tone: "free" as const };

  return { label: "Profissional", tone: "professional" as const };
};

export const resolveRegistryLabel = (item: PsychologistsListItem) =>
  item.registry_verification.status === "aprovado"
    ? { label: "Ativo", tone: "active" as const }
    : { label: "Pendente", tone: "pending" as const };

export const resolveProfileLabel = (item: PsychologistsListItem) =>
  item.published
    ? { label: "Ativo", tone: "active" as const }
    : { label: "Inativo", tone: "inactive" as const };

export const resolveProfileConversionLabel = (item: PsychologistsListItem) => {
  if (item.profile_conversion.id === "strong_conversion")
    return { label: item.profile_conversion.label, tone: "active" as const };
  if (item.profile_conversion.id === "standard_conversion")
    return { label: item.profile_conversion.label, tone: "info" as const };
  if (item.profile_conversion.id === "low_conversion")
    return { label: item.profile_conversion.label, tone: "warning" as const };
  if (item.profile_conversion.id === "no_conversion")
    return { label: item.profile_conversion.label, tone: "danger" as const };

  return { label: item.profile_conversion.label, tone: "inactive" as const };
};

export const RowActions = ({ item }: { item: PsychologistsListItem }) => (
  <div className="flex shrink-0 items-center justify-center gap-1.5">
    <Link
      className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-foreground shadow-control transition hover:border-primary hover:text-primary"
      href={item.detail_url}
      onClick={(event) => event.stopPropagation()}
      title="Abrir detalhe administrativo"
    >
      <Eye aria-hidden className="h-4 w-4" />
      <span className="sr-only">Abrir detalhe administrativo de {item.name}</span>
    </Link>
    <a
      className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-foreground shadow-control transition hover:border-primary hover:text-primary"
      href={toPublicFrontendHref(item.public_profile_url)}
      onClick={(event) => event.stopPropagation()}
      rel="noreferrer"
      target="_blank"
      title="Abrir perfil público"
    >
      <ExternalLink aria-hidden className="h-4 w-4" />
      <span className="sr-only">Abrir perfil público de {item.name}</span>
    </a>
  </div>
);

export const PsychologistCard = ({ item }: { item: PsychologistsListItem }) => {
  const plan = resolvePlanLabel(item);
  const profile = resolveProfileLabel(item);
  const registry = resolveRegistryLabel(item);
  const profileConversion = resolveProfileConversionLabel(item);

  return (
    <article
      aria-label={`Resumo administrativo de ${item.name}`}
      className="min-w-0 rounded-[1.5rem] border border-border bg-surface p-4"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={item.name} src={item.avatar} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {item.ranking_position ? `#${item.ranking_position} - ` : ""}
              {item.name}{" "}
              {item.verified ? (
                <VerifiedBadgeIcon
                  aria-label="Perfil verificado"
                  className="inline h-3.5 w-3.5 align-[-1px]"
                />
              ) : null}
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-muted" title={item.email}>
              {item.email}
            </p>
          </div>
        </div>
        <RowActions item={item} />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        <StatusText tone={plan.tone}>{plan.label}</StatusText>
        <StatusText tone={profile.tone}>Perfil {profile.label}</StatusText>
        <StatusText tone={registry.tone}>Registro {registry.label}</StatusText>
        <StatusText tone={profileConversion.tone}>{profileConversion.label}</StatusText>
      </div>

      <dl className="mt-4 grid max-w-xs gap-2 text-xs text-muted">
        <div className="rounded-2xl bg-surface-muted px-3 py-2">
          <dt>Data de cadastro</dt>
          <dd className="mt-1 text-sm font-semibold text-foreground">
            {formatRegistrationDate(item.created_at)}
          </dd>
        </div>
      </dl>
    </article>
  );
};

export const PsychologistsTable = ({
  items,
  onOpenDetail,
}: {
  items: PsychologistsListItem[];
  onOpenDetail: (href: string) => void;
}) => (
  <>
    <div className="grid min-w-0 gap-3 p-3 lg:hidden">
      {items.map((item) => (
        <PsychologistCard item={item} key={item.id} />
      ))}
    </div>

    <div className="hidden min-w-0 max-w-full overflow-hidden lg:block">
      <table className="w-full table-fixed text-left text-sm">
        <caption className="sr-only">Lista administrativa de psicólogos</caption>
        <colgroup>
          <col className="w-[6%]" />
          <col className="w-[28%]" />
          <col className="w-[13%]" />
          <col className="w-[10%]" />
          <col className="w-[9%]" />
          <col className="w-[10%]" />
          <col className="w-[16%]" />
          <col className="w-[8%]" />
        </colgroup>
        <thead className="border-b border-border bg-surface-muted/70 text-xs text-muted">
          <tr>
            <th className="py-4 pl-3 pr-2 font-semibold">Rank</th>
            <th className="px-2 py-4 font-semibold">Psicólogo</th>
            <th className="px-2 py-4 font-semibold">Data de cadastro</th>
            <th className="px-2 py-4 font-semibold">Plano</th>
            <th className="px-2 py-4 font-semibold">Perfil</th>
            <th className="px-2 py-4 font-semibold">Registro</th>
            <th className="px-2 py-4 font-semibold">Conversão</th>
            <th className="px-2 py-4 text-center font-semibold">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => {
            const plan = resolvePlanLabel(item);
            const profile = resolveProfileLabel(item);
            const registry = resolveRegistryLabel(item);
            const profileConversion = resolveProfileConversionLabel(item);

            return (
              <tr
                aria-label={`Abrir detalhe administrativo de ${item.name}`}
                className="cursor-pointer transition hover:bg-primary-soft/35 focus:bg-primary-soft/60 focus:outline-none"
                key={item.id}
                onClick={() => onOpenDetail(item.detail_url)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenDetail(item.detail_url);
                  }
                }}
                tabIndex={0}
              >
                <td className="whitespace-nowrap py-4 pl-3 pr-2 text-lg font-semibold text-primary">
                  {item.ranking_position ? `#${item.ranking_position}` : "—"}
                </td>
                <td className="px-2 py-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={item.name} src={item.avatar} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {item.name}{" "}
                        {item.verified ? (
                          <VerifiedBadgeIcon
                            aria-label="Perfil verificado"
                            className="inline h-3.5 w-3.5 align-[-1px]"
                          />
                        ) : null}
                      </p>
                      <p className="truncate text-xs font-bold text-muted" title={item.email}>
                        {item.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-2 py-3 font-semibold text-foreground">
                  {formatRegistrationDate(item.created_at)}
                </td>
                <td className="whitespace-nowrap px-2 py-3">
                  <StatusText tone={plan.tone}>{plan.label}</StatusText>
                </td>
                <td className="whitespace-nowrap px-2 py-3">
                  <StatusText tone={profile.tone}>{profile.label}</StatusText>
                </td>
                <td className="whitespace-nowrap px-2 py-3">
                  <StatusText tone={registry.tone}>{registry.label}</StatusText>
                </td>
                <td className="px-2 py-3">
                  <StatusText tone={profileConversion.tone}>{profileConversion.label}</StatusText>
                </td>
                <td className="px-2 py-3 text-center">
                  <RowActions item={item} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </>
);

export const LoadingState = () => (
  <div className="space-y-4">
    {LOADING_ROWS.map((key) => (
      <div className="h-24 animate-pulse rounded-3xl bg-surface-muted" key={key} />
    ))}
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <AdminQueryErrorState
    message={message}
    onRetry={onRetry}
    title="Não foi possível carregar a lista"
  />
);

export const EmptyState = () => (
  <div className="rounded-3xl border border-dashed border-border bg-surface-muted p-8 text-center">
    <UsersRound aria-hidden className="mx-auto h-10 w-10 text-primary" />
    <h2 className="mt-3 text-lg font-semibold text-foreground">Nenhum psicólogo encontrado</h2>
    <p className="mt-1 text-sm text-muted">
      Ajuste a busca ou limpe os filtros para ver profissionais cadastrados.
    </p>
  </div>
);

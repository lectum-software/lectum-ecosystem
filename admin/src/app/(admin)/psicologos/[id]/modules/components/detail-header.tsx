"use client";

import { AlertTriangle, ExternalLink, Mail, Star, UserRound, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  useAdminPsychologistAccount,
  useAdminPsychologistReports,
} from "@/api/callers/psychologists";
import type {
  AdminPsychologistDetail,
  AdminPsychologistReportsQuery,
} from "@/api/req/psychologists";
import { VerifiedBadgeIcon, WhatsAppIcon } from "@/components/admin-icons";
import { toPublicFrontendHref } from "@/lib/public-frontend-url";
import { cn } from "@/lib/utils";
import type { ActiveTab } from "../support/config";
import { TABS } from "../support/config";
import {
  formatAdminHeaderCrp,
  formatDateTime,
  formatHeaderWhatsappDisplay,
  getHeaderAccountStatus,
  getHeaderPlanLabel,
  getHeaderRatingLabel,
  getPsychologistTitle,
  needsManualRegistryReview,
} from "../support/formatters";
import { Avatar, CardShell } from "./shared";

export const DetailHeader = ({
  detail,
  id,
  tab,
}: {
  detail: AdminPsychologistDetail;
  id: string;
  tab: ActiveTab;
}) => {
  const pathname = usePathname();
  const header = detail.header;
  const showProfileRegistryAlert = needsManualRegistryReview(detail);
  const headerPlan = getHeaderPlanLabel(detail);
  const headerRating = getHeaderRatingLabel(header);
  const headerWhatsapp = formatHeaderWhatsappDisplay(detail.profile.personal.phone);
  const accountStatusQuery = useAdminPsychologistAccount(id);
  const headerAccountStatus = getHeaderAccountStatus(accountStatusQuery.data, {
    isError: accountStatusQuery.isError,
    isLoading: accountStatusQuery.isLoading,
  });
  const reportsAlertInput = useMemo<AdminPsychologistReportsQuery>(
    () => ({ limit: 1, page: 1, status: "pending", type: "all" }),
    [],
  );
  const reportsAlertQuery = useAdminPsychologistReports(id, reportsAlertInput);
  const pendingReportsCount =
    reportsAlertQuery.data?.cards.find((card) => card.id === "pending")?.value ?? 0;

  return (
    <CardShell className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 md:flex-row md:items-start md:justify-between md:p-7">
        <div className="flex flex-col gap-5 sm:flex-1 sm:flex-row sm:items-center">
          <Avatar name={header.name} src={header.avatar} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                {header.name}
              </h1>
              {header.verified ? (
                <VerifiedBadgeIcon aria-label="Perfil verificado" className="h-6 w-6" />
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
              <span>{getPsychologistTitle(detail.profile.professional.gender)}</span>
              <span aria-hidden>•</span>
              <span>{formatAdminHeaderCrp(detail)}</span>
            </div>
            <div className="mt-4 flex min-w-0 flex-nowrap items-center gap-x-5 overflow-x-auto text-sm text-muted sm:gap-x-6 md:overflow-visible xl:gap-x-8">
              <span
                className="inline-flex min-w-0 max-w-72 shrink items-center gap-2 whitespace-nowrap"
                title={detail.profile.personal.email}
              >
                <Mail aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 truncate">{detail.profile.personal.email}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
                <WhatsAppIcon aria-hidden className="h-4 w-4 text-primary" />
                <span>{headerWhatsapp}</span>
              </span>
              <span
                aria-busy={accountStatusQuery.isLoading && !accountStatusQuery.data}
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap"
                title={headerAccountStatus.title}
              >
                <UserRound aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="sr-only">Status da conta: </span>
                  {headerAccountStatus.label}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
                <Wallet aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span>{headerPlan}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
                <Star aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span>{headerRating}</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-muted">
              Último acesso: {formatDateTime(header.last_access_at)}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:flex-col xl:flex-row">
          <a
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-primary/45 bg-surface px-5 text-sm font-black text-primary shadow-control transition hover:bg-primary-soft"
            href={toPublicFrontendHref(header.public_profile_url)}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink aria-hidden className="h-4 w-4" />
            Ver perfil público
          </a>
        </div>
      </div>

      <div className="overflow-x-auto border-t border-border bg-surface-muted/40 px-3">
        <nav aria-label="Abas do detalhe do psicólogo" className="flex min-w-max gap-1 py-1">
          {TABS.map((item) => {
            const active = item.id === tab;
            const showRegistryAlert = item.id === "perfil" && showProfileRegistryAlert;
            const showReportsAlert = item.id === "denuncias" && pendingReportsCount > 0;
            const className = cn(
              "relative inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-black transition",
              active ? "text-primary" : "text-foreground hover:text-primary",
            );

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={className}
                href={item.id === "geral" ? pathname : `${pathname}?tab=${item.id}`}
                key={item.id}
              >
                <span>{item.label}</span>
                {showRegistryAlert ? (
                  <AlertTriangle
                    aria-label="Registro profissional pendente de verificação manual"
                    className="h-4 w-4 text-danger"
                  />
                ) : null}
                {showReportsAlert ? (
                  <AlertTriangle
                    aria-label="Há denúncias pendentes"
                    className="h-4 w-4 text-danger"
                  />
                ) : null}
                {active ? (
                  <span className="absolute inset-x-4 bottom-1 h-1 rounded-full bg-primary" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </CardShell>
  );
};

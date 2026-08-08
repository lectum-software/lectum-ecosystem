"use client";

import { Activity, ChevronLeft, ChevronRight, CircleHelp } from "lucide-react";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AdminPsychologistsDashboard } from "@/api/req/psychologists";
import { cn } from "@/lib/utils";

import { formatSelectedPeriod, type PlanSegmentFilter } from "../modules/dashboard-support";
import { CardShell } from "./metric-cards";

import {
  formatPatientPostsAnsweredValue,
  formatProfileActivityStandardRange,
  formatProfileConversionGoalRange,
  formatProfileConversionStandardRange,
  formatProfileEngagementStandardRange,
  formatProfileExposureSurfaceStandardRange,
  formatProfileFavoritesStandardRange,
  ProfileActivityDonutChart,
  ProfileConversionDonutChart,
  ProfileConversionGoalDonutChart,
  ProfileCoverageDonutChart,
  ProfileEngagementFavoritesAxisDonutChart,
  ProfileExposureSurfaceDonutChart,
} from "./profile-donuts";
import { getPlanSegmentSummary, PanelTitle, PlanSegmentSelect } from "./timeline-filters";

export const DashboardProfileSignalTooltip = ({
  metricDescription,
}: {
  details?: string[];
  guidance?: string;
  metricDescription: string;
  standardLabel?: string;
}) => <span className="block text-foreground">{metricDescription}</span>;

export const DashboardProfileSignalHelpTooltip = ({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: ReactNode;
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const showTooltip = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const width = Math.min(360, Math.max(240, viewportWidth - 32));
    const left = Math.min(Math.max(16, rect.left - 16), Math.max(16, viewportWidth - width - 16));

    setPosition({
      left,
      top: rect.bottom + 6,
      width,
    });
  }, []);
  const hideTooltip = useCallback(() => {
    setPosition(null);
  }, []);

  return (
    <button
      aria-label={ariaLabel}
      className="relative mt-1 inline-flex shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      onBlur={hideTooltip}
      onFocus={showTooltip}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      ref={buttonRef}
      type="button"
    >
      <CircleHelp aria-hidden className="h-4 w-4 text-muted" />
      {position && typeof document !== "undefined"
        ? createPortal(
            <span
              className="pointer-events-none fixed z-[9999] rounded-xl border border-border bg-surface p-3 text-left text-xs font-medium leading-5 text-foreground shadow-admin-soft"
              role="tooltip"
              style={{
                left: position.left,
                top: position.top,
                width: position.width,
              }}
            >
              {children}
            </span>,
            document.body,
          )
        : null}
    </button>
  );
};

export const DashboardProfileSignalCard = ({
  children,
  className,
  standardValue,
  title,
  tooltipAriaLabel,
  tooltipContent,
}: {
  children: ReactNode;
  className?: string;
  standardValue: string;
  title: string;
  tooltipAriaLabel: string;
  tooltipContent: ReactNode;
}) => (
  <section
    className={cn(
      "group flex h-full w-full min-w-0 flex-col rounded-[1.75rem] border border-border/80 bg-surface p-4 shadow-sm transition duration-200 hover:border-primary/25 hover:shadow-admin-soft",
      className,
    )}
  >
    <div className="min-w-0">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <span className="inline-flex min-w-0 items-start gap-2">
          <h3 className="min-w-0 text-lg font-black leading-6 text-foreground">{title}</h3>
          <DashboardProfileSignalHelpTooltip ariaLabel={tooltipAriaLabel}>
            {tooltipContent}
          </DashboardProfileSignalHelpTooltip>
        </span>
      </div>
      <div className="mt-3 min-h-[4.85rem] rounded-[1.15rem] border border-primary/15 bg-primary-soft/35 px-3 py-2.5">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-subtle">Padrão</p>
        <p className="mt-1 text-base font-black leading-snug text-foreground">{standardValue}</p>
      </div>
    </div>
    {children}
  </section>
);

export const PROFILE_SIGNAL_CARD_WRAPPER_CLASS =
  "flex min-h-[31rem] w-full shrink-0 snap-start sm:w-[calc((100%_-_1rem)/2)] xl:w-[calc((100%_-_2rem)/3)] 2xl:w-[calc((100%_-_3rem)/4)]";

export const DashboardProfileSignalsCarousel = ({ children }: { children: ReactNode }) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollCards = useCallback((direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      behavior: "smooth",
      left: direction * Math.max(340, scroller.clientWidth * 0.9),
    });
  }, []);

  return (
    <div className="mt-5 min-w-0">
      <div className="relative min-w-0 px-11 sm:px-12">
        <button
          aria-label="Rolar gráficos de donut para a esquerda"
          className="absolute left-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface text-muted shadow-sm transition hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={() => scrollCards(-1)}
          type="button"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
        </button>
        <div
          className="flex min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          ref={scrollerRef}
        >
          {children}
        </div>
        <button
          aria-label="Rolar gráficos de donut para a direita"
          className="absolute right-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-primary/25 bg-primary-soft text-primary shadow-sm transition hover:border-primary/45 hover:bg-primary-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={() => scrollCards(1)}
          type="button"
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export const DashboardProfileConversionCard = ({
  summary,
}: {
  summary: AdminPsychologistsDashboard;
}) => {
  const [profileConversionPlanSegment, setProfileConversionPlanSegment] =
    useState<PlanSegmentFilter>("all");
  const profileConversionSegmentSummary = getPlanSegmentSummary(
    summary,
    profileConversionPlanSegment,
  );
  const profileActivity = profileConversionSegmentSummary.profile_activity;
  const profileCoverage = profileConversionSegmentSummary.profile_coverage;
  const profileConversion = profileConversionSegmentSummary.profile_conversion;
  const profileConversionGoal = profileConversionSegmentSummary.profile_conversion_goal;
  const profileEngagementFavorites = profileConversionSegmentSummary.profile_engagement_favorites;
  const profileExposure = profileConversionSegmentSummary.profile_exposure;
  if (
    !profileActivity ||
    !profileCoverage ||
    !profileConversion ||
    !profileConversionGoal ||
    !profileEngagementFavorites ||
    !profileExposure
  ) {
    return null;
  }

  const activityStandardRangeLabel = formatProfileActivityStandardRange(profileActivity.thresholds);
  const coverageAverageLabel = `${formatPatientPostsAnsweredValue(
    profileCoverage.totals.average_patient_posts_answered,
  )} por psicólogo`;
  const standardRangeLabel = formatProfileConversionStandardRange(profileConversion.benchmark);
  const conversionGoalRangeLabel = formatProfileConversionGoalRange(
    profileConversionGoal.thresholds.absolute,
  );
  const communityVisibilityStandardRangeLabel = formatProfileExposureSurfaceStandardRange(
    profileExposure.benchmark.community_visibility,
  );
  const videoVisibilityStandardRangeLabel = formatProfileExposureSurfaceStandardRange(
    profileExposure.benchmark.presentation_video,
  );
  const engagementStandardRangeLabel = formatProfileEngagementStandardRange(
    profileEngagementFavorites.benchmark.community_engagement,
  );
  const favoritesStandardRangeLabel = formatProfileFavoritesStandardRange(
    profileEngagementFavorites.benchmark.favorites,
  );
  const hasConversionStandardRange =
    profileConversion.benchmark.standard_min_whatsapp_clicks !== null &&
    profileConversion.benchmark.standard_max_whatsapp_clicks !== null;
  const conversionTooltipStandardText = hasConversionStandardRange
    ? `${standardRangeLabel} no WhatsApp`
    : standardRangeLabel;

  return (
    <CardShell className="relative z-20 overflow-visible p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PanelTitle
          description={formatSelectedPeriod(summary.period)}
          icon={Activity}
          title="Indicadores dos psicólogos"
        />
        <PlanSegmentSelect
          id="profile-conversion-plan-segment"
          onChange={setProfileConversionPlanSegment}
          value={profileConversionPlanSegment}
        />
      </div>

      <DashboardProfileSignalsCarousel>
        <div className={PROFILE_SIGNAL_CARD_WRAPPER_CLASS}>
          <DashboardProfileSignalCard
            standardValue={conversionTooltipStandardText}
            title="Conversão"
            tooltipAriaLabel={`Conversão mede cliques recebidos no WhatsApp, o sinal mais próximo de contato com o paciente. Padrão da plataforma no período: ${conversionTooltipStandardText}.`}
            tooltipContent={
              <DashboardProfileSignalTooltip
                details={[
                  "A classificação usa os cliques no botão de WhatsApp atribuídos ao perfil no período selecionado.",
                  "Não inclui favoritos, visualizações ou outras interações que não indiquem intenção direta de contato.",
                ]}
                guidance="Use para encontrar psicólogos que transformam visibilidade em intenção concreta de contato."
                metricDescription="Agrupa os psicólogos por volume de cliques recebidos no WhatsApp, o sinal mais próximo de uma conversa iniciada com paciente."
                standardLabel={conversionTooltipStandardText}
              />
            }
          >
            <ProfileConversionDonutChart profileConversion={profileConversion} />
          </DashboardProfileSignalCard>
        </div>

        <div className={PROFILE_SIGNAL_CARD_WRAPPER_CLASS}>
          <DashboardProfileSignalCard
            standardValue={conversionGoalRangeLabel}
            title="Meta de conversão"
            tooltipAriaLabel="Classifica os psicólogos pela meta absoluta de cliques no WhatsApp, normalizando o ritmo para uma janela de 30 dias."
            tooltipContent={
              <DashboardProfileSignalTooltip metricDescription="Classifica os psicólogos pela meta absoluta de cliques no WhatsApp, normalizando o ritmo para uma janela de 30 dias." />
            }
          >
            <ProfileConversionGoalDonutChart profileConversionGoal={profileConversionGoal} />
          </DashboardProfileSignalCard>
        </div>

        <div className={PROFILE_SIGNAL_CARD_WRAPPER_CLASS}>
          <DashboardProfileSignalCard
            standardValue={activityStandardRangeLabel}
            title="Atividade"
            tooltipAriaLabel={`Atividade mede ações autorais do psicólogo nas comunidades. Padrão da plataforma no período: ${activityStandardRangeLabel}.`}
            tooltipContent={
              <DashboardProfileSignalTooltip
                details={[
                  "Conta posts publicados e respostas criadas pelo psicólogo nas comunidades.",
                  "Ajuda a diferenciar perfis ativos de perfis com pouca base comportamental recente.",
                ]}
                guidance="Use para identificar quem está contribuindo com conteúdo e presença contínua na comunidade."
                metricDescription="Mede as publicações do psicólogo no período selecionado."
                standardLabel={activityStandardRangeLabel}
              />
            }
          >
            <ProfileActivityDonutChart profileActivity={profileActivity} />
          </DashboardProfileSignalCard>
        </div>

        <div className={PROFILE_SIGNAL_CARD_WRAPPER_CLASS}>
          <DashboardProfileSignalCard
            standardValue={coverageAverageLabel}
            title="Cobertura"
            tooltipAriaLabel={`Cobertura compara quantos posts únicos de pacientes cada psicólogo respondeu. Média da plataforma no período: ${coverageAverageLabel}.`}
            tooltipContent={
              <DashboardProfileSignalTooltip
                details={[
                  "Conta posts únicos de pacientes com ao menos uma resposta do psicólogo.",
                  "Evita inflar o resultado quando várias respostas ficam concentradas no mesmo post.",
                ]}
                guidance="Use para avaliar amplitude de atendimento nas comunidades, não apenas volume bruto de respostas."
                metricDescription="Compara quantas demandas diferentes de pacientes cada psicólogo alcançou no período."
                standardLabel={coverageAverageLabel}
              />
            }
          >
            <ProfileCoverageDonutChart profileCoverage={profileCoverage} />
          </DashboardProfileSignalCard>
        </div>

        <div className={PROFILE_SIGNAL_CARD_WRAPPER_CLASS}>
          <DashboardProfileSignalCard
            standardValue={engagementStandardRangeLabel}
            title="Engajamento"
            tooltipAriaLabel={`Engajamento recebido usa score ponderado de comentários, compartilhamentos, salvamentos e votos positivos recebidos na comunidade. Padrão da plataforma no período: ${engagementStandardRangeLabel}.`}
            tooltipContent={
              <DashboardProfileSignalTooltip
                details={[
                  "Considera sinais recebidos no conteúdo do psicólogo, como comentários, compartilhamentos, salvamentos e votos positivos.",
                  "O score ponderado facilita comparar perfis com interações de pesos diferentes.",
                ]}
                guidance="Use para entender quais psicólogos geram resposta da comunidade após publicar ou responder."
                metricDescription="Mede a reação da comunidade ao conteúdo autoral do psicólogo."
                standardLabel={engagementStandardRangeLabel}
              />
            }
          >
            <ProfileEngagementFavoritesAxisDonutChart
              axis="engagement"
              profileEngagementFavorites={profileEngagementFavorites}
            />
          </DashboardProfileSignalCard>
        </div>

        <div className={PROFILE_SIGNAL_CARD_WRAPPER_CLASS}>
          <DashboardProfileSignalCard
            standardValue={communityVisibilityStandardRangeLabel}
            title="Visibilidade na comunidade"
            tooltipAriaLabel={`Visibilidade na comunidade mede a atenção recebida em conteúdo autoral nas comunidades. Padrão da plataforma no período: ${communityVisibilityStandardRangeLabel}.`}
            tooltipContent={
              <DashboardProfileSignalTooltip
                details={[
                  "Usa atenção recebida em posts e respostas autorais dentro das comunidades.",
                  "Não mistura listagens, favoritos ou cliques de WhatsApp com a visibilidade comunitária.",
                ]}
                guidance="Use para ver quais perfis estão sendo vistos a partir da participação nas comunidades."
                metricDescription="Mostra a visibilidade conquistada pelo psicólogo por presença e conteúdo na comunidade."
                standardLabel={communityVisibilityStandardRangeLabel}
              />
            }
          >
            <ProfileExposureSurfaceDonutChart
              profileExposure={profileExposure}
              surface="community"
            />
          </DashboardProfileSignalCard>
        </div>

        <div className={PROFILE_SIGNAL_CARD_WRAPPER_CLASS}>
          <DashboardProfileSignalCard
            standardValue={videoVisibilityStandardRangeLabel}
            title="Vídeo de apresentação"
            tooltipAriaLabel={`Vídeo de apresentação mede o tempo assistido no vídeo do perfil. Padrão da plataforma no período: ${videoVisibilityStandardRangeLabel}.`}
            tooltipContent={
              <DashboardProfileSignalTooltip
                details={[
                  "Usa o tempo assistido no vídeo de apresentação do perfil.",
                  "Não classifica pelo simples fato de o psicólogo ter vídeo, e sim pela atenção recebida nele.",
                ]}
                guidance="Use para avaliar se o vídeo está gerando descoberta e retenção no perfil."
                metricDescription="Mostra quanto o vídeo de apresentação contribui para a visibilidade do psicólogo."
                standardLabel={videoVisibilityStandardRangeLabel}
              />
            }
          >
            <ProfileExposureSurfaceDonutChart profileExposure={profileExposure} surface="video" />
          </DashboardProfileSignalCard>
        </div>

        <div className={PROFILE_SIGNAL_CARD_WRAPPER_CLASS}>
          <DashboardProfileSignalCard
            standardValue={favoritesStandardRangeLabel}
            title="Favoritados"
            tooltipAriaLabel={`Favoritados mede os favoritos recebidos pelo psicólogo. Padrão da plataforma no período: ${favoritesStandardRangeLabel}.`}
            tooltipContent={
              <DashboardProfileSignalTooltip
                details={[
                  "Conta os favoritos recebidos por cada psicólogo no período selecionado.",
                  "É um sinal de intenção intermediária: o paciente ainda não chamou no WhatsApp, mas salvou o perfil.",
                ]}
                guidance="Use para encontrar psicólogos lembrados pelos pacientes mesmo quando a conversão ainda não aconteceu."
                metricDescription="Mede quantas vezes o perfil do psicólogo foi salvo pelos pacientes."
                standardLabel={favoritesStandardRangeLabel}
              />
            }
          >
            <ProfileEngagementFavoritesAxisDonutChart
              axis="favorites"
              profileEngagementFavorites={profileEngagementFavorites}
            />
          </DashboardProfileSignalCard>
        </div>
      </DashboardProfileSignalsCarousel>
    </CardShell>
  );
};

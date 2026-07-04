"use client";

import {
  ArrowRight,
  Award,
  BadgeCheck,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Gift,
  type LucideIcon,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePsychologistBilling } from "@/api/callers/psychologist-billing";
import type { ProfessionalSubscription } from "@/api/generator/types/billing";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { PSYCHOLOGIST_ONBOARDING_PATHS } from "@/utils/psychologist-onboarding";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const formatDate = (value?: string | null) => {
  if (!value) return "Sem data definida";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return dateFormatter.format(date);
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Não foi possível carregar sua assinatura agora.";
};

type BenefitGroup = {
  icon: LucideIcon;
  items: string[];
  title: string;
};

const professionalBenefitGroups: BenefitGroup[] = [
  {
    icon: ShieldCheck,
    title: "Mais credibilidade",
    items: ["Perfil profissional verificado", "Receba avaliações e depoimentos"],
  },
  {
    icon: Search,
    title: "Mais visibilidade",
    items: [
      "Prioridade na busca de pacientes",
      "Respostas destacadas nas comunidades",
      "Respostas nas comunidades com mídia",
      "Elegível ao Top Mentor",
    ],
  },
  {
    icon: BarChart3,
    title: "Mais recursos para seu perfil",
    items: ["Até 10 especialidades", "Serviços profissionais ilimitados", "Estatísticas de perfil"],
  },
];

const BenefitGroupCard = ({ group }: { group: BenefitGroup }) => {
  const Icon = group.icon;

  return (
    <article className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-extrabold text-foreground">{group.title}</h3>
      </div>

      <ul className="mt-3 grid gap-2.5">
        {group.items.map((item) => (
          <li className="flex gap-2.5 text-sm leading-5 text-muted" key={item}>
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
};

export const ProfessionalBillingSubscriptionLogic = () => {
  const { current } = usePsychologistBilling();

  return (
    <ProfessionalBillingSubscriptionView
      error={current.error}
      isError={current.isError}
      isLoading={current.isLoading}
      subscription={current.data?.current || null}
    />
  );
};

export const ProfessionalBillingSubscriptionView = ({
  error,
  isError,
  isLoading,
  subscription,
}: {
  error?: unknown;
  isError: boolean;
  isLoading: boolean;
  subscription: ProfessionalSubscription | null;
}) => {
  const isCourtesy =
    subscription?.source === "admin_grant" &&
    subscription.status === "ativa" &&
    subscription.plan?.slug === "profissional";
  const isFreePlan = subscription?.plan?.slug === "gratuito";
  const planName = subscription?.plan?.name || "Plano não encontrado";
  const expirationLabel = formatDate(subscription?.current_period_end);
  const shouldShowPlanDetails = Boolean(subscription) && !isFreePlan;
  const shouldShowExpiration =
    shouldShowPlanDetails && (isCourtesy || Boolean(subscription?.current_period_end));
  const shouldShowUpgradeCta = !isLoading && !isError && !isCourtesy;
  const heroTitle = isCourtesy ? "Plano Profissional de cortesia" : planName;
  const heroDescription = isCourtesy
    ? "Você está com todos os benefícios de um psicólogo assinante liberados durante o período da cortesia."
    : isFreePlan
      ? "Você já pode participar das comunidades e manter seu perfil ativo na Lectum."
      : "Veja o plano ativo no seu perfil profissional.";

  return (
    <PrivateTemplate showHeader={false}>
      <section
        className={`mx-auto grid w-full max-w-[430px] gap-5 md:max-w-3xl ${
          shouldShowUpgradeCta ? "pb-28 md:pb-32" : ""
        }`}
      >
        <AppPageHeader
          backHref="/app/profile"
          backLabel="Voltar ao perfil"
          title="Minha assinatura"
        />

        {isLoading ? <LoadingState label="Carregando sua assinatura" /> : null}

        {isError ? (
          <InlineAlert title="Não foi possível carregar sua assinatura" variant="error">
            {getErrorMessage(error)}
          </InlineAlert>
        ) : null}

        {!isLoading && !isError ? (
          <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-6 shadow-[var(--lectum-shadow-soft)] md:px-7 md:py-7">
            <div className="grid justify-items-center text-center">
              <span className="relative grid h-[72px] w-[72px] place-items-center rounded-3xl bg-primary-soft text-primary shadow-[var(--lectum-shadow-soft)]">
                {isCourtesy ? (
                  <Gift className="h-8 w-8" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="h-8 w-8" aria-hidden="true" />
                )}
                <span className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full border border-primary/20 bg-surface text-primary">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                </span>
              </span>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-primary">
                {isCourtesy ? "Sua cortesia ativa" : "Seu plano atual"}
              </p>
              <h1 className="mt-2 text-2xl font-bold leading-tight text-foreground">{heroTitle}</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-muted">{heroDescription}</p>
            </div>

            {shouldShowPlanDetails ? (
              <div
                className={
                  shouldShowExpiration
                    ? "mt-6 grid gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted p-3 md:grid-cols-2"
                    : "mt-6 rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted p-3"
                }
              >
                <div className="flex items-center gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 md:p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                    <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">Plano atual</p>
                    <p className="mt-1 text-sm text-muted">{planName}</p>
                  </div>
                </div>
                {shouldShowExpiration ? (
                  <div className="flex items-center gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 md:p-5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                      <CalendarClock className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {isCourtesy ? "Expiração da cortesia" : "Expiração"}
                      </p>
                      <p className="mt-1 text-sm text-muted">{expirationLabel}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {isCourtesy ? (
              <>
                <InlineAlert className="mt-6 text-left" title="Próximo passo" variant="warning">
                  Para continuar como assinante após a cortesia, cadastre os dados do cartão no
                  checkout. A cobrança só será ativada após a confirmação do pagamento.
                </InlineAlert>

                <Button asChild className="mt-6 h-12 w-full rounded-full">
                  <Link href="/app/professional/billing/checkout?intent=courtesy-renewal">
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    Inserir dados do cartão
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <section className="mt-6">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                      <Award className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-base font-extrabold leading-6 text-foreground">
                        O que você desbloqueia com a Assinatura Profissional
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-muted">
                        Benefícios pensados para fortalecer sua autoridade e ampliar sua presença na
                        Lectum.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {professionalBenefitGroups.map((group) => (
                      <BenefitGroupCard group={group} key={group.title} />
                    ))}
                  </div>
                </section>

                <div className="mt-6 rounded-[var(--lectum-card-radius)] border border-primary/20 bg-primary-soft p-5">
                  <div className="flex gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-primary">
                      <Sparkles className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-base font-extrabold leading-6 text-foreground">
                        Amplie sua presença profissional na Lectum
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        Profissionais assinantes recebem mais destaque dentro da plataforma,
                        fortalecem sua autoridade nas comunidades e aumentam suas oportunidades de
                        atendimento.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}
      </section>

      {shouldShowUpgradeCta ? (
        <div className="fixed inset-x-0 bottom-0 z-50 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:px-6">
          <div className="mx-auto w-full max-w-[430px] rounded-[var(--lectum-card-radius)] border border-border/80 bg-surface/95 p-2 shadow-[var(--lectum-shadow)] backdrop-blur supports-[backdrop-filter]:bg-surface/90 md:max-w-3xl">
            <Button asChild className="h-12 w-full rounded-full text-base">
              <Link href={PSYCHOLOGIST_ONBOARDING_PATHS.checkout}>
                Fazer upgrade
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </PrivateTemplate>
  );
};

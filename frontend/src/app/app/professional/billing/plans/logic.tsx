"use client";

import { ArrowRight, BadgeCheck, Banknote, CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePsychologistBilling } from "@/api/callers/psychologist-billing";
import type { SubscriptionPlan, SubscriptionPlanFeatures } from "@/api/generator/types/billing";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import {
  getAfterPlanSelectionPath,
  PSYCHOLOGIST_ONBOARDING_PATHS,
} from "@/utils/psychologist-onboarding";

type FeatureRow = {
  included: boolean;
  label: string;
};

const planTones: Record<string, { eyebrow: string; popular?: boolean }> = {
  gratuito: {
    eyebrow: "Iniciante",
  },
  profissional: {
    eyebrow: "Profissional",
    popular: true,
  },
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatPrice = (priceCents: number) => {
  return currencyFormatter.format(priceCents / 100);
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Não foi possível carregar os planos agora.";
};

const getFeatureRows = (plan: SubscriptionPlan): FeatureRow[] => {
  const features = (plan.features || {}) as SubscriptionPlanFeatures;
  const specialtiesLimit = features.specialties_limit || 0;
  const servicesLimit = features.services_limit;

  return [
    {
      included: true,
      label: "Crie seu perfil e apareça para pacientes interessados",
    },
    {
      included: Boolean(features.whatsapp_conversion),
      label: "Botão de conversão para o seu WhatsApp",
    },
    {
      included: specialtiesLimit > 0,
      label: specialtiesLimit
        ? `Até ${specialtiesLimit} especialidades`
        : "Especialidades profissionais",
    },
    {
      included: Boolean(servicesLimit),
      label:
        servicesLimit === "all"
          ? "Ofereça todos os serviços disponíveis"
          : `Ofereça ${servicesLimit || 1} serviço profissional`,
    },
    {
      included: Boolean(features.verified_badge),
      label: "Selo de verificado no perfil",
    },
    {
      included: Boolean(features.search_priority),
      label: "Apareça nos primeiros resultados de busca",
    },
    {
      included: Boolean(features.professional_community),
      label: "Participe da comunidade como Profissional",
    },
    {
      included: Boolean(features.profile_video),
      label: "Upload de vídeo de apresentação",
    },
    {
      included: Boolean(features.analytics),
      label: "Acesso aos Analytics",
    },
    {
      included: Boolean(features.patient_testimonials),
      label: "Receba depoimentos de pacientes",
    },
    {
      included: Boolean(features.priority_support),
      label: "Suporte prioritário via WhatsApp",
    },
  ];
};

const PlanCard = ({
  currentSlug,
  isSelectingFree,
  onSelectFree,
  plan,
}: {
  currentSlug?: string | null;
  isSelectingFree?: boolean;
  onSelectFree: () => void;
  plan: SubscriptionPlan;
}) => {
  const tone = planTones[plan.slug] || { eyebrow: "Plano" };
  const isProfessional = plan.slug === "profissional";
  const isFree = plan.slug === "gratuito";
  const isCurrent = currentSlug === plan.slug;
  const features = getFeatureRows(plan);

  return (
    <article
      className={cn(
        "relative rounded-[var(--lectum-card-radius)] border bg-surface p-6 shadow-[var(--lectum-shadow-soft)]",
        isProfessional ? "border-primary" : "border-border",
      )}
    >
      {tone.popular ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wide text-white">
          Mais popular
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {tone.eyebrow}
          </p>
          <h2 className="mt-4 text-2xl font-bold text-foreground">{plan.name}</h2>
        </div>
        {isCurrent ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Atual
          </span>
        ) : null}
      </div>

      <div className="mt-7 flex items-end gap-2">
        <strong className="text-4xl font-bold leading-none text-foreground">
          {formatPrice(plan.price_cents)}
        </strong>
        <span className="pb-1 text-sm font-medium text-muted">/mês</span>
      </div>

      <ul className="mt-8 grid gap-4">
        {features.map((feature) => {
          const Icon = feature.included ? CheckCircle2 : XCircle;

          return (
            <li className="flex gap-3 text-sm leading-6 text-muted" key={feature.label}>
              <Icon
                className={cn(
                  "mt-0.5 h-5 w-5 shrink-0",
                  feature.included ? "text-primary" : "text-danger",
                )}
                aria-hidden
              />
              <span>{feature.label}</span>
            </li>
          );
        })}
      </ul>

      {isProfessional ? (
        <Button asChild className="mt-8 w-full">
          <Link href={PSYCHOLOGIST_ONBOARDING_PATHS.checkout}>
            {isCurrent ? "Continuar assinatura" : "Assinar agora"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      ) : null}

      {isFree ? (
        <Button
          className="mt-8 w-full"
          disabled={isSelectingFree}
          onClick={onSelectFree}
          type="button"
          variant="outline"
        >
          {isSelectingFree ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {isCurrent ? "Continuar configuração" : "Começar grátis"}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      ) : null}
    </article>
  );
};

export const PsychologistBillingPlansLogic = () => {
  const router = useRouter();
  const { current, plans, selectFree } = usePsychologistBilling({
    callbacks: {
      selectFree: {
        onSuccess: () => {
          toast.success("Plano gratuito selecionado");
          router.push(getAfterPlanSelectionPath());
        },
      },
    },
  });
  const isLoading = plans.isLoading || current.isLoading;
  const hasError = plans.isError || current.isError;
  const planList = plans.data?.plans || [];
  const currentSlug = current.data?.current?.plan?.slug || null;

  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[430px] gap-6 md:max-w-5xl">
        <div className="grid justify-items-center gap-4 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-[var(--lectum-card-radius)] bg-primary-soft text-primary shadow-[var(--lectum-shadow-soft)]">
            <BadgeCheck className="h-8 w-8" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">Planos de Assinatura</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-foreground md:text-4xl">
              Escolha o plano ideal para sua carreira
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted">
              Após escolher um plano, você confirma o WhatsApp profissional. O plano gratuito segue
              direto para a configuração de perfil; a assinatura passa primeiro pelo pagamento real.
            </p>
          </div>
        </div>

        <div className="grid gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted p-4 text-sm text-muted md:grid-cols-2">
          <div>
            <strong className="text-foreground">Gratuito:</strong> plano → telefone → perfil.
          </div>
          <div>
            <strong className="text-foreground">Assinatura:</strong> plano → pagamento → telefone →
            endereço → CRP → perfil.
          </div>
        </div>

        {isLoading ? <LoadingState label="Carregando planos profissionais" /> : null}

        {hasError ? (
          <InlineAlert variant="error" title="Não foi possível carregar os planos">
            {getErrorMessage(plans.error || current.error)}
          </InlineAlert>
        ) : null}

        {!isLoading && !hasError && planList.length === 0 ? (
          <EmptyState
            description="Nenhum plano ativo foi encontrado no backend. Cadastre os planos reais antes de seguir para checkout."
            icon={Banknote}
            title="Planos indisponíveis"
          />
        ) : null}

        {planList.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 md:items-start">
            {planList.map((plan) => (
              <PlanCard
                currentSlug={currentSlug}
                isSelectingFree={selectFree.isPending && plan.slug === "gratuito"}
                key={plan.id}
                onSelectFree={() => {
                  if (currentSlug === "gratuito") {
                    router.push(getAfterPlanSelectionPath());
                    return;
                  }

                  selectFree.mutate();
                }}
                plan={plan}
              />
            ))}
          </div>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};

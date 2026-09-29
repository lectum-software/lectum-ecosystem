"use client";

import { ArrowRight, BadgeCheck, Banknote, CheckCircle2, Info, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { usePsychologistBilling } from "@/api/callers/psychologist-billing";
import { getSafeApiErrorMessage } from "@/api/errors";
import type { SubscriptionPlan } from "@/api/generator/types/billing";
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
  description?: string;
  included: boolean;
  label: string;
  previewImage?: {
    alt: string;
    height: number;
    src: string;
    width: number;
  };
};

const socialVideoBenefit: Pick<FeatureRow, "description" | "label" | "previewImage"> = {
  label: "Transforme suas respostas em vídeo em conteúdos para redes sociais",
  description:
    "Ao responder postagens das comunidades com vídeo, a Lectum gera automaticamente uma versão personalizada com arte em formato de caixinha de pergunta e sua identificação profissional, pronta para publicar no Instagram, TikTok e demais redes sociais. Disponível de forma ilimitada para suas respostas em vídeo.",
  previewImage: {
    alt: "Exemplo de vídeo-resposta da Lectum com caixinha de pergunta e identificação profissional.",
    height: 899,
    src: "/images/billing/social-video-example.png",
    width: 494,
  },
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
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatPrice = (priceCents: number) => {
  return currencyFormatter.format(priceCents / 100);
};

const getErrorMessage = (error: unknown) =>
  getSafeApiErrorMessage(error, "Não foi possível carregar os planos agora.");

const getFeatureRows = (plan: SubscriptionPlan): FeatureRow[] => {
  if (plan.slug === "gratuito") {
    return [
      {
        included: true,
        label: "Crie seu perfil profissional",
      },
      {
        included: true,
        label: "Cadastre seu WhatsApp para receber contatos",
      },
      {
        included: true,
        label: "Responda postagens das comunidades por texto",
      },
      {
        included: true,
        label: "Cadastre até 3 especialidades",
      },
      {
        included: true,
        label: "Cadastre 1 serviço profissional",
      },
    ];
  }

  if (plan.slug === "profissional") {
    return [
      {
        included: true,
        label: "Crie seu perfil profissional com selo de verificado",
      },
      {
        included: true,
        label: "Cadastre seu WhatsApp para receber contatos",
      },
      {
        included: true,
        label: "Receba avaliações e depoimentos de pacientes",
      },
      {
        included: true,
        label: "Tenha prioridade na busca por psicólogos",
      },
      {
        included: true,
        label: "Responda postagens das comunidades com vídeo, imagem e texto",
      },
      {
        included: true,
        ...socialVideoBenefit,
      },
      {
        included: true,
        label: "Possibilidade de aparecer como Top Mentor nas comunidades",
      },
      {
        included: true,
        label: "Cadastre até 10 especialidades",
      },
      {
        included: true,
        label: "Cadastre todos os serviços que você oferece",
      },
      {
        included: true,
        label: "Estatísticas do seu perfil, como cliques gerados para WhatsApp",
      },
    ];
  }

  return [];
};

const FeatureInfoPopover = ({ feature }: { feature: FeatureRow }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useId();

  if (!feature.description) return null;

  return (
    <span className="relative inline-flex align-middle">
      <button
        aria-controls={popoverId}
        aria-expanded={isOpen}
        aria-label={`Entenda o benefício: ${feature.label}`}
        className="ml-1.5 inline-grid h-5 w-5 place-items-center rounded-full border border-primary/30 bg-primary-soft text-primary transition hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
        type="button"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>

      {isOpen ? (
        <span
          className="absolute left-1/2 top-7 z-30 grid w-[min(20rem,calc(100vw-3rem))] -translate-x-1/2 gap-3 rounded-2xl border border-border bg-surface p-3 text-left shadow-[var(--lectum-shadow)] md:w-80"
          id={popoverId}
          role="dialog"
        >
          <span className="text-sm font-extrabold leading-5 text-foreground">
            Conteúdo pronto para redes sociais
          </span>
          <span className="text-xs leading-5 text-muted">{feature.description}</span>
          {feature.previewImage ? (
            <Image
              alt={feature.previewImage.alt}
              className="w-full rounded-xl border border-border object-cover shadow-[var(--lectum-shadow-soft)]"
              height={feature.previewImage.height}
              sizes="(max-width: 767px) 320px, 288px"
              src={feature.previewImage.src}
              width={feature.previewImage.width}
            />
          ) : null}
        </span>
      ) : null}
    </span>
  );
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
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
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
          return (
            <li className="flex gap-3 text-sm leading-6 text-muted" key={feature.label}>
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <span>
                {feature.label}
                <FeatureInfoPopover feature={feature} />
              </span>
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
            <div className="mx-auto mt-4 grid max-w-2xl gap-3 text-base leading-7 text-muted">
              <p className="text-lg font-black tracking-[-0.02em] text-foreground">
                Mais visibilidade. Mais autoridade. Mais oportunidades.
              </p>
              <p>
                Escolha entre começar gratuitamente ou acessar todas as ferramentas profissionais da
                Lectum para fortalecer sua presença, construir reputação e ampliar suas
                oportunidades de atendimento.
              </p>
            </div>
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
            description="Nenhum plano profissional ativo está disponível no momento. Tente novamente mais tarde."
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

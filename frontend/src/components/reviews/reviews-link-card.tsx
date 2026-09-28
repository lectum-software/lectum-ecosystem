"use client";

import { ArrowRight, Award, CheckCircle2, Copy, Star } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";

const premiumReviewBenefits = [
  "Receba avaliações de pacientes",
  "Exiba depoimentos no seu perfil",
  "Fortaleça sua reputação profissional",
  "Aumente sua credibilidade na plataforma",
];

export const PremiumReviewsState = () => (
  <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-7 shadow-[var(--lectum-shadow-soft)] md:px-8 md:py-9">
    <div className="mx-auto grid max-w-2xl justify-items-center text-center">
      <span className="relative grid h-[72px] w-[72px] place-items-center rounded-3xl bg-surface text-primary shadow-[var(--lectum-shadow-soft)]">
        <Award className="h-8 w-8" aria-hidden />
        <span className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full border border-primary/20 bg-surface text-primary">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
        </span>
      </span>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-primary">
        Recurso profissional
      </p>
      <h2 className="mt-2 text-2xl font-extrabold leading-tight text-foreground">
        Desbloqueie avaliações de pacientes
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base md:leading-7">
        Ao fazer upgrade para o Plano Profissional, seus pacientes poderão registrar avaliações e
        depoimentos sobre seus atendimentos. As avaliações recebidas aparecerão aqui e ajudarão a
        fortalecer sua credibilidade na Lectum.
      </p>
    </div>

    <div className="mt-7 grid gap-3 md:grid-cols-2">
      {premiumReviewBenefits.map((benefit) => (
        <div
          className="flex min-w-0 items-start gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4"
          key={benefit}
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          <span className="min-w-0 text-sm font-semibold leading-5 text-muted">{benefit}</span>
        </div>
      ))}
    </div>

    <div className="mt-7 flex justify-center">
      <Button asChild className="h-12 w-full rounded-full text-base sm:w-auto sm:px-8">
        <Link href="/app/profissional/assinatura">
          Fazer upgrade
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Button>
    </div>
  </section>
);

export const ReviewsLinkCard = ({ link, locked }: { link: string; locked?: boolean }) => {
  const copyLink = async () => {
    if (locked) return;

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar o link agora.");
    }
  };

  return (
    <section className="min-w-0 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <Star className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold leading-6 text-foreground">
            Link da minha página de avaliações
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted">
            Compartilhe com pacientes e fortaleça sua autoridade com depoimentos reais.
          </p>
        </div>
      </div>

      <div className="mt-4 flex h-12 min-w-0 items-center gap-3 rounded-[var(--lectum-control-radius)] border border-border bg-surface-muted px-3">
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-semibold text-muted",
            locked && "select-none blur-[5px]",
          )}
        >
          {link}
        </p>
        <button
          aria-label="Copiar link de avaliações"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/10 bg-surface text-primary transition hover:bg-primary-soft disabled:opacity-50"
          disabled={locked}
          onClick={copyLink}
          type="button"
        >
          <Copy className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        {locked
          ? "O link e a coleta de avaliações ficam totalmente liberados após o upgrade."
          : "Incentive os pacientes a te avaliarem para aparecer nos primeiros resultados de busca."}
      </p>
    </section>
  );
};

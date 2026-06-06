"use client";

import { CheckCircle2, UserRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

export const ReviewsSuccessLogic = () => {
  const psychologistId = useSearchParams().get("psychologist_id");
  return (
    <PrivateTemplate>
      <section className="mx-auto grid min-h-[70vh] w-full max-w-[390px] place-items-center gap-8 text-center sm:max-w-[430px]">
        <div className="grid justify-items-center gap-5">
          <span className="grid h-40 w-40 place-items-center rounded-full bg-primary-soft text-primary">
            <CheckCircle2 className="h-20 w-20" aria-hidden />
          </span>
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">Avaliação enviada!</h1>
            <p className="mt-4 text-base leading-7 text-muted">
              Obrigado por compartilhar. Seu depoimento valoriza o trabalho profissional e ajuda
              outros pacientes.
            </p>
          </div>
          <section className="flex w-full items-center gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 text-left shadow-[var(--lectum-shadow-soft)]">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
              <UserRound className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-primary">Avaliação concluída</p>
              <p className="font-semibold text-foreground">Registro salvo com segurança</p>
            </div>
          </section>
        </div>
        <div className="grid w-full gap-3">
          <Button asChild>
            <Link href="/app/reviews">Finalizar</Link>
          </Button>
          {psychologistId ? (
            <Button asChild variant="outline">
              <Link href={`/app/psychologist/${psychologistId}`}>Voltar ao perfil</Link>
            </Button>
          ) : null}
        </div>
      </section>
    </PrivateTemplate>
  );
};

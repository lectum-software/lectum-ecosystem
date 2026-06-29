"use client";

import { ArrowRight, CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

export const SuggestCommunitySuccessLogic = () => {
  return (
    <PrivateTemplate showMobileNavigation={false} desktopSidebarDefaultCollapsed>
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[430px] content-start gap-8 pb-8 sm:max-w-xl">
        <header className="sticky top-0 z-20 -mx-5 border-b border-border bg-background/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="flex h-12 items-center gap-3">
            <Link
              aria-label="Voltar para comunidades"
              className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
              href="/community"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Link>
            <h1 className="text-xl font-black text-foreground">Confirmação</h1>
          </div>
        </header>

        <div className="grid justify-items-center gap-7 pt-24 text-center">
          <span className="grid h-24 w-24 place-items-center rounded-full bg-primary-soft text-primary shadow-[var(--lectum-shadow-soft)]">
            <CheckCircle2 className="h-12 w-12" aria-hidden="true" />
          </span>

          <article className="grid gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface px-6 py-8 shadow-[var(--lectum-shadow-soft)]">
            <h2 className="text-2xl font-black text-foreground">Sugestão enviada!</h2>
            <p className="text-sm leading-6 text-muted">
              Sua proposta para uma nova comunidade na Lectum foi registrada e será analisada pela
              nossa equipe.
            </p>
          </article>

          <Button asChild className="h-14 w-full rounded-full">
            <Link href="/community">
              Voltar para a Comunidade
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </PrivateTemplate>
  );
};

"use client";

import { ArrowLeft, FilePenLine } from "lucide-react";
import Link from "next/link";
import { PrivateTemplate } from "@/templates/private";
import { COMMUNITY_CREATE_POST_HREF, DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";

export const CreateCommunityPostLogic = () => {
  return (
    <PrivateTemplate
      bottomNavigationCenterAction={{
        ariaLabel: "Criar publicação na comunidade",
        href: COMMUNITY_CREATE_POST_HREF,
        title: "Criar publicação",
      }}
      contentClassName="bg-[#F5F7FA] dark:bg-background"
      navigationTheme="solidWhite"
      showHeader
    >
      <section className="mx-auto grid w-full max-w-[430px] gap-5 sm:max-w-2xl lg:max-w-3xl">
        <Link
          className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-sm font-bold text-[#475569] transition hover:border-primary/40 hover:bg-primary-soft hover:text-primary dark:bg-surface dark:text-muted"
          href={DEFAULT_COMMUNITY_FEED_HREF}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para o feed
        </Link>

        <div className="grid min-h-[55vh] place-items-center rounded-[28px] border border-[#E6EAF0] bg-white p-8 text-center shadow-[0_16px_38px_rgba(15,23,42,0.07)] dark:border-border dark:bg-surface">
          <div className="grid max-w-sm gap-4">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary">
              <FilePenLine className="h-8 w-8" aria-hidden="true" />
            </span>
            <div className="grid gap-2">
              <p className="text-sm font-black uppercase tracking-[0.08em] text-primary">
                Criar publicação
              </p>
              <h1 className="text-2xl font-black tracking-[-0.03em] text-foreground">
                A tela de criação de post está preparada
              </h1>
              <p className="text-sm leading-6 text-muted">
                Este será o espaço para pacientes e psicólogos escreverem conteúdos nas comunidades.
                A implementação do formulário real entra nas próximas tasks de criação e moderação.
              </p>
            </div>
          </div>
        </div>
      </section>
    </PrivateTemplate>
  );
};

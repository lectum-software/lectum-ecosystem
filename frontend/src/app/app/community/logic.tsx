"use client";

import { Compass, Network, PlusCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { PrivateTemplate } from "@/templates/private";

export const CommunityLogic = () => {
  return (
    <PrivateTemplate allowAnonymous>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-3xl">
        <div className="grid gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
            <Network className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-foreground">Comunidade Lectum</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Espaço reservado para posts, respostas e comunidades reais do produto.
            </p>
          </div>
        </div>

        <InlineAlert title="Sem mock de feed" variant="info">
          Esta rota usa o shell e mantém estado vazio até as APIs reais de comunidades serem
          implementadas.
        </InlineAlert>

        <EmptyState
          action={
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              Criação de post será liberada com a API real
            </span>
          }
          description="Quando comunidades reais forem cadastradas, o feed aparecerá aqui com carregamento, paginação e interações persistidas."
          icon={Compass}
          title="Nenhuma comunidade carregada"
        />
      </section>
    </PrivateTemplate>
  );
};

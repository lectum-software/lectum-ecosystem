"use client";

import { Filter, ShieldCheck, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { PrivateTemplate } from "@/templates/private";

export const PsychologistsLogic = () => {
  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-3xl">
        <div className="grid gap-4 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
          <div className="flex items-center gap-3 rounded-[var(--lectum-control-radius)] border border-border bg-surface-muted px-4 py-3 text-muted">
            <UsersRound className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="text-sm">Listagem de profissionais</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
              Tudo
            </span>
            <span className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-muted">
              Ansiedade
            </span>
            <span className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-muted">
              Depressão
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-muted">
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filtros
            </span>
          </div>
        </div>

        <InlineAlert title="Base visual preparada" variant="success">
          O shell privado está pronto. A listagem real e os filtros serão conectados na próxima task
          de descoberta, sem dados simulados.
        </InlineAlert>

        <EmptyState
          description="Nenhum diretório de psicólogos foi conectado ainda. Assim que a API real da busca estiver disponível, os profissionais aparecerão nesta área."
          icon={ShieldCheck}
          title="Nenhum psicólogo carregado"
        />
      </section>
    </PrivateTemplate>
  );
};

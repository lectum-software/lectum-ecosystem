"use client";

import { ClipboardCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/api/callers/auth";
import type { user } from "@/api/generator/types";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { getToken } from "@/hooks/cookies/token";
import { useAppSelector } from "@/hooks/redux";
import { useUserSet } from "@/hooks/user-set";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

const crpStatusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

export const PsychologistCfpLogic = () => {
  const storedUser = useAppSelector((state) => state.user);
  const token = getToken();
  const { setter } = useUserSet(null);

  const { hidrate } = useAuth({
    enableHidrate: Boolean(token),
  });

  useEffect(() => {
    if (hidrate.data) {
      setter(hidrate.data);
    }
  }, [hidrate.data, setter]);

  const currentUser = useMemo<Partial<user> | null>(
    () => hidrate.data || storedUser || null,
    [hidrate.data, storedUser],
  );

  const profile = currentUser?.psychologist_profile;
  const status = profile?.crp_status || "pendente";
  const statusLabel = crpStatusLabels[status] || "Pendente";
  const isPsychologist = currentUser?.role === "psicologo";

  return (
    <PrivateTemplate>
      <section className="grid gap-5">
        {hidrate.isLoading ? <LoadingState label="Atualizando seu perfil profissional" /> : null}

        {!isPsychologist && currentUser?.role ? (
          <InlineAlert variant="warning" title="Perfil não autorizado">
            Esta etapa é exclusiva para psicólogos cadastrados na Lectum.
          </InlineAlert>
        ) : null}

        <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-6 shadow-[var(--lectum-shadow-soft)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Validação profissional</p>
              <h1 className="mt-2 text-3xl font-semibold">Consulta CFP/CRP</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Seu cadastro profissional foi criado. A conta permanece privada até a validação do
                CRP/CFP e aprovação do perfil.
              </p>
            </div>
            <span className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Status: {statusLabel}
            </span>
          </div>
        </div>

        {profile ? (
          <InlineAlert variant="info" title="Próxima etapa">
            A consulta automática de CFP/CRP depende de uma fonte oficial definida. Até lá, o perfil
            fica com status pendente e sem exposição pública.
          </InlineAlert>
        ) : (
          <EmptyState
            action={
              <Button asChild variant="outline">
                <Link href="/dashboard">Voltar ao dashboard</Link>
              </Button>
            }
            description="Quando o backend retornar o perfil profissional real, esta etapa exibirá o status de validação sem dados simulados."
            icon={ClipboardCheck}
            title="Nenhum perfil profissional carregado"
          />
        )}
      </section>
    </PrivateTemplate>
  );
};

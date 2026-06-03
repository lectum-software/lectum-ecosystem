"use client";

import { ShieldCheck, UserRound } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/api/callers/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { getToken } from "@/hooks/cookies/token";
import { useAppSelector } from "@/hooks/redux";
import { useUserSet } from "@/hooks/user-set";
import { PrivateTemplate } from "@/templates/private";

export const DashboardLogic = () => {
  const storedUser = useAppSelector((state) => state.user);
  const { setter } = useUserSet(null);
  const token = getToken();

  const { hidrate } = useAuth({
    enableHidrate: Boolean(token),
  });

  useEffect(() => {
    if (hidrate.data) {
      setter(hidrate.data);
    }
  }, [hidrate.data, setter]);

  const currentUser = hidrate.data || storedUser;

  return (
    <PrivateTemplate>
      <section className="grid gap-5">
        <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-6 shadow-[var(--lectum-shadow-soft)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Área privada</p>
              <h1 className="mt-2 text-3xl font-semibold">
                Olá, {currentUser?.name || "usuário"}.
              </h1>
              <p className="mt-2 text-sm text-muted">Sessão autenticada com o backend Lectum.</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-[var(--lectum-card-radius)] bg-primary-soft text-primary">
              <ShieldCheck className="h-8 w-8" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <article className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Usuario</h2>
                <p className="text-sm text-muted">{currentUser?.email || "Sem e-mail"}</p>
              </div>
            </div>
          </article>

          <article className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
            <h2 className="text-sm font-semibold">Status</h2>
            <p className="mt-2 text-2xl font-semibold">
              {currentUser?.active === false ? "Inativo" : "Ativo"}
            </p>
          </article>

          <article className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
            <h2 className="text-sm font-semibold">Token</h2>
            <p className="mt-2 text-2xl font-semibold">{token ? "Presente" : "Ausente"}</p>
          </article>
        </div>

        {!currentUser?.email ? (
          <EmptyState
            description="Quando o backend retornar os dados do usuário, este espaço será preenchido com informações reais."
            icon={UserRound}
            title="Nenhum dado de usuário carregado"
          />
        ) : null}
      </section>
    </PrivateTemplate>
  );
};

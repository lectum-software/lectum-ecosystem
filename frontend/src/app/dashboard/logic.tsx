"use client";

import { ShieldCheck, UserRound } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/api/callers/auth";
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
      <section className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-8">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">Area privada</p>
              <h1 className="mt-2 text-3xl font-semibold">
                Ola, {currentUser?.name || "usuario"}.
              </h1>
              <p className="mt-2 text-sm text-zinc-500">Sessao autenticada com o backend Lectum.</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-8 w-8" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Usuario</h2>
                <p className="text-sm text-zinc-500">{currentUser?.email || "Sem e-mail"}</p>
              </div>
            </div>
          </article>

          <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Status</h2>
            <p className="mt-2 text-2xl font-semibold">
              {currentUser?.active === false ? "Inativo" : "Ativo"}
            </p>
          </article>

          <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Token</h2>
            <p className="mt-2 text-2xl font-semibold">{token ? "Presente" : "Ausente"}</p>
          </article>
        </div>
      </section>
    </PrivateTemplate>
  );
};

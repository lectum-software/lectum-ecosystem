"use client";

import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/api/callers/auth";
import type { user } from "@/api/generator/types";
import { Logo } from "@/components/ui/logo";
import { useUserSet } from "@/hooks/user-set";
import { CenterTemplate } from "@/templates/center";

const DEFAULT_AUTHENTICATED_REDIRECT = "/psicologos";
const DELETE_ACCOUNT_PATIENT_REDIRECT = "/app/perfil/editar?deleteReauth=ok";
const DELETE_ACCOUNT_PSYCHOLOGIST_REDIRECT = "/app/profissional/perfil/configurar?deleteReauth=ok";

export const RedirectLogic = () => {
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  const fallbackRedirect = useMemo(() => {
    if (intent !== "delete_account") return DEFAULT_AUTHENTICATED_REDIRECT;

    return (data: user) =>
      data.role === "psicologo"
        ? DELETE_ACCOUNT_PSYCHOLOGIST_REDIRECT
        : DELETE_ACCOUNT_PATIENT_REDIRECT;
  }, [intent]);
  const { setter } = useUserSet(fallbackRedirect);
  const { googleMe } = useAuth({
    callbacks: {
      googleMe: {
        onSuccess: setter,
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : "Nao foi possivel concluir o login";
          toast.error(message);
          window.location.href = `/auth/error?error=${encodeURIComponent(message)}&clearSession=1`;
        },
      },
    },
  });

  const { mutate } = googleMe;

  useEffect(() => {
    mutate();
  }, [mutate]);

  return (
    <CenterTemplate>
      <div className="grid w-full justify-items-center gap-5 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-7 text-center shadow-[var(--lectum-shadow-soft)]">
        <Logo className="w-[132px] sm:w-[144px]" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <div className="grid gap-1.5">
          <h1 className="text-xl font-bold text-foreground">Conectando com o Google</h1>
          <p className="text-sm leading-6 text-muted">Aguarde enquanto validamos sua sessão.</p>
        </div>
      </div>
    </CenterTemplate>
  );
};

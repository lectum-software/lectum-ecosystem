"use client";

import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/api/callers/auth";
import { getToken } from "@/hooks/cookies/token";
import { useUserSet } from "@/hooks/user-set";
import { CenterTemplate } from "@/templates/center";

export const RedirectLogic = () => {
  const { setter } = useUserSet("/dashboard");
  const { googleMe } = useAuth({
    callbacks: {
      googleMe: {
        onSuccess: setter,
        onError: (error) => {
          if (getToken()) return;

          const message =
            error instanceof Error ? error.message : "Nao foi possivel concluir o login";
          toast.error(message);
          window.location.href = "/auth/login";
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
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-zinc-950" aria-hidden="true" />
        <h1 className="mt-5 text-xl font-semibold">Conectando com Google</h1>
        <p className="mt-2 text-sm text-zinc-500">Aguarde enquanto validamos sua sessao.</p>
      </div>
    </CenterTemplate>
  );
};

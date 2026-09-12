"use client";

import { useCurrentLegal } from "@/api/callers/legal";
import { LegalLinks } from "./links";
import { hasCompleteLegalSet } from "./policy";

export const LegalRegistrationNotice = () => {
  const current = useCurrentLegal();
  const configured = !current.isError && hasCompleteLegalSet(current.data);
  return (
    <div className="mt-4 grid gap-3 text-center text-xs leading-5 text-muted">
      <LegalLinks documents={configured ? current.data?.documents : []} newTab />
      <p>
        {current.isPending
          ? "Consultando documentos publicados."
          : configured
            ? "O aceite dos Termos de Serviço e a ciência da Política de Privacidade serão solicitados separadamente após entrar. Criar a conta não registra esse aceite."
            : "Os documentos publicados estão indisponíveis no momento. Criar a conta não registra aceite jurídico. Quando disponíveis, eles serão apresentados após entrar."}
      </p>
    </div>
  );
};

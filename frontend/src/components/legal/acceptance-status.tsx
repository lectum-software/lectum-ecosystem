"use client";

import { useAuth } from "@/api/callers/auth";
import { useLegalStatus } from "@/api/callers/legal";
import type { FullPublishedDoc } from "@/api/req/legal/types";
import { useAuthTokenPresence } from "@/hooks/use-auth-token-presence";
import { acceptanceStatusText } from "./acceptance-status-text";

export const LegalAcceptanceStatus = ({ document }: { document: FullPublishedDoc }) => {
  const hasToken = useAuthTokenPresence();
  const { hidrate } = useAuth({ enableHidrate: hasToken });
  const userId = hasToken ? (hidrate.data?.id ?? "") : "";
  const query = useLegalStatus(userId);
  if (!hasToken) return null;
  const acceptance = query.data?.acceptances.find((item) => item.document_id === document.id);
  const text =
    hidrate.isError || (userId && query.isError)
      ? "Não foi possível consultar sua confirmação agora."
      : hidrate.isPending || (userId && query.isPending)
        ? "Consultando sua confirmação..."
        : !userId || !query.data
          ? "Não foi possível consultar sua confirmação agora."
          : acceptanceStatusText(document.kind, acceptance?.accepted_at);
  return (
    <p className="mt-3 text-sm font-semibold leading-6 text-muted" role="status">
      {text}
    </p>
  );
};

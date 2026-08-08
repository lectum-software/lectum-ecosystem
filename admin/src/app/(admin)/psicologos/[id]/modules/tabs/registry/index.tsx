"use client";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAdminPsychologistRegistryVerification } from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import { CardShell, ErrorState, IconCircle } from "../../components/shared";
import type { RegistryIdentityFormValues } from "../../support/schemas";
import {
  RegistryApproveForm,
  RegistryAttemptItem,
  RegistryIdentityForm,
  RegistryRejectForm,
  RegistrySaveIdentityForm,
  RegistryVerificationDialog,
  registryVerificationBadge,
} from "./actions";

export const RegistryVerificationCard = ({ id }: { id: string }) => {
  const [action, setAction] = useState<"approve" | "reject" | "save" | null>(null);
  const [identityDraft, setIdentityDraft] = useState<RegistryIdentityFormValues | null>(null);
  const query = useAdminPsychologistRegistryVerification(id);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) {
    return (
      <CardShell className="p-5">
        <div className="h-40 animate-pulse rounded-3xl bg-surface-muted" />
      </CardShell>
    );
  }

  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }

  const registry = query.data;
  if (!registry) return null;

  const emptyAttemptsText =
    registry.summary.plan_type === "cortesia" && registry.summary.source === "admin_grant"
      ? "Aprovação manual via Cortesia."
      : "Nenhuma tentativa automática ou decisão manual registrada.";

  return (
    <CardShell className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <IconCircle icon={ShieldCheck} />
          <div>
            <h2 className="text-lg font-bold text-foreground">Registro profissional</h2>
          </div>
        </div>
        {registryVerificationBadge(registry)}
      </div>

      <div className="mt-5 grid gap-3 rounded-3xl border border-info-border bg-info-soft/70 p-4">
        <RegistryIdentityForm
          canApprove={registry.actions.can_approve_manually}
          canReject={registry.actions.can_reject_manually}
          onApprove={(values) => {
            setIdentityDraft(values);
            setAction("approve");
          }}
          onReject={() => setAction("reject")}
          onSave={(values) => {
            setIdentityDraft(values);
            setAction("save");
          }}
          registry={registry}
        />
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-bold text-foreground">Últimas tentativas</h3>
        {registry.latest_attempts.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
            {emptyAttemptsText}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {registry.latest_attempts.slice(0, 4).map((attempt) => (
              <RegistryAttemptItem attempt={attempt} key={attempt.id} />
            ))}
          </ul>
        )}
      </div>

      {action === "save" && identityDraft ? (
        <RegistryVerificationDialog onClose={() => setAction(null)} title="Salvar registro">
          <RegistrySaveIdentityForm
            id={id}
            identityDraft={identityDraft}
            onClose={() => setAction(null)}
            registry={registry}
          />
        </RegistryVerificationDialog>
      ) : null}

      {action === "approve" && registry.actions.can_approve_manually ? (
        <RegistryVerificationDialog onClose={() => setAction(null)} title="Aprovar CRP manualmente">
          <RegistryApproveForm
            id={id}
            identityDraft={identityDraft}
            onClose={() => setAction(null)}
            registry={registry}
          />
        </RegistryVerificationDialog>
      ) : null}

      {action === "reject" && registry.actions.can_reject_manually ? (
        <RegistryVerificationDialog onClose={() => setAction(null)} title="Rejeitar verificação">
          <RegistryRejectForm id={id} onClose={() => setAction(null)} />
        </RegistryVerificationDialog>
      ) : null}
    </CardShell>
  );
};

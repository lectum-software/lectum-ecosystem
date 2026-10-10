"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useAccount } from "@/api/callers/account";
import { Button } from "@/registry/new-york-v4/ui/button";

export const PatientPrivacyExplanation = () => (
  <div className="space-y-3 text-sm leading-6 text-muted">
    <p>Somente psicólogos têm um perfil público na Lectum. Esta página é exclusiva para você.</p>
    <p>
      Nas comunidades, seu nome e sua foto podem aparecer nas publicações, a menos que você escolha
      publicar anonimamente.
    </p>
  </div>
);

export const PatientPrivacyNotice = () => {
  const { onboardingTips, updateOnboardingTips } = useAccount({
    enableSecurity: false,
    enableTips: true,
    requirePersistedTips: true,
  });

  if (onboardingTips.isPending || onboardingTips.data?.has_seen_patient_privacy_notice === true) {
    return null;
  }

  return (
    <section
      aria-labelledby="patient-privacy-notice-title"
      className="rounded-[var(--lectum-card-radius)] border border-primary/15 bg-primary-soft/50 p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center gap-2 text-primary">
        <ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0" />
        <h2 className="text-base font-bold text-foreground" id="patient-privacy-notice-title">
          Seu perfil não é público
        </h2>
      </div>
      <PatientPrivacyExplanation />
      {updateOnboardingTips.isError ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          Não foi possível salvar sua confirmação. Tente novamente.
        </p>
      ) : null}
      <Button
        className="mt-4 min-h-11 w-full sm:w-auto"
        disabled={updateOnboardingTips.isPending}
        onClick={() => updateOnboardingTips.mutate({ has_seen_patient_privacy_notice: true })}
        type="button"
        variant="default"
      >
        {updateOnboardingTips.isPending ? "Salvando..." : "Entendi"}
      </Button>
    </section>
  );
};

export const PatientPrivacyPolicyLink = () => (
  <Link
    className="text-sm font-semibold text-primary underline underline-offset-4"
    href="/politica-de-privacidade"
  >
    Consultar Política de Privacidade
  </Link>
);

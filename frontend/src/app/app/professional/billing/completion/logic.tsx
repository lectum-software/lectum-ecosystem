"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import keys from "@/api/cache/keys";
import type { SubscriptionPlanFeatures } from "@/api/generator/types/billing";
import { hidrate } from "@/api/req/auth";
import {
  getPsychologistBillingCurrent,
  savePsychologistBillingAddress,
} from "@/api/req/psychologist-billing";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import {
  getPaidSubscriptionNextPath,
  PSYCHOLOGIST_ONBOARDING_PATHS as paths,
} from "@/utils/psychologist-onboarding";
import { getProfileBillingAddress } from "@/utils/upgrade-address";
import { billingAddressSchema } from "../address/use-form";

const benefitLabels = [
  ["verified_badge", "Selo de profissional verificado"],
  ["search_priority", "Prioridade na busca de psicólogos"],
  ["profile_video", "Vídeo de apresentação no perfil"],
  ["patient_testimonials", "Avaliações de pacientes"],
  ["analytics", "Estatísticas do seu perfil"],
  ["professional_community", "Comunidade profissional"],
  ["priority_support", "Suporte prioritário"],
] as const;

export const SubscriptionCompletionLogic = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAppSelector((state) => state.user?.id);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [features, setFeatures] = useState<SubscriptionPlanFeatures>({});

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt explicitly retries the failed request sequence.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const resume = async () => {
      try {
        // Never decide verification or completion from a stale pre-payment session.
        const user = await hidrate();
        const billing = await getPsychologistBillingCurrent();
        if (cancelled) return;
        let next = getPaidSubscriptionNextPath(
          user,
          billing.current,
          billing.billing_address_complete,
        );
        if (next === paths.billingAddress) {
          const address = billingAddressSchema.safeParse(
            getProfileBillingAddress(user.psychologist_profile),
          );
          if (address.success) {
            await savePsychologistBillingAddress(address.data);
            if (cancelled) return;
            billing.billing_address_complete = true;
            next = getPaidSubscriptionNextPath(user, billing.current, true);
          }
        }
        queryClient.setQueryData(keys.auth.hydrate(user.id), user);
        queryClient.setQueryData(keys.psychologistBilling.current(), billing);
        if (next !== paths.completion) {
          router.replace(next);
          return;
        }
        setFeatures(billing.current?.plan?.features ?? {});
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    };
    void resume();
    return () => {
      cancelled = true;
    };
  }, [userId, queryClient, router, attempt]);

  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-xl gap-6 px-2 py-8">
        {status === "loading" ? <LoadingState label="Verificando sua próxima etapa" /> : null}
        {status === "error" ? (
          <InlineAlert title="Não foi possível conferir seus dados" variant="error">
            <p>Sua assinatura não será cobrada novamente. Tente continuar mais uma vez.</p>
            <Button
              className="mt-4"
              onClick={() => {
                setStatus("loading");
                setAttempt((value) => value + 1);
              }}
            >
              Tentar novamente
            </Button>
          </InlineAlert>
        ) : null}
        {status === "ready" ? (
          <>
            <CheckCircle2 aria-hidden className="h-12 w-12 text-success" />
            <header className="grid gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                Seu Plano Profissional está ativo!
              </h1>
              <p className="text-base leading-7 text-muted">
                Seu registro profissional está confirmado. Aproveite os benefícios da sua assinatura
                e complete seu perfil quando quiser.
              </p>
            </header>
            <ul className="grid gap-4">
              {benefitLabels
                .filter(([key]) => features[key] === true)
                .map(([key, label]) => (
                  <li key={key} className="flex items-start gap-3 text-foreground">
                    <Check aria-hidden className="h-5 w-5 shrink-0 text-primary" />
                    {label}
                  </li>
                ))}
            </ul>
            <Button asChild className="h-12 w-full">
              <Link href={paths.profileSetup}>
                Completar meu perfil <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </Button>
            <Link
              className="text-center text-sm text-primary underline"
              href="/app/profissional/assinatura"
            >
              Ir para Minha Assinatura
            </Link>
          </>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};

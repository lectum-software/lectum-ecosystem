"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/api/callers/auth";
import { usePsychologistCfp } from "@/api/callers/psychologist-cfp";
import type { CfpSearchResponse, user } from "@/api/generator/types";
import { InlineAlert } from "@/components/ui/inline-alert";
import { getToken } from "@/hooks/cookies/token";
import { useAppSelector } from "@/hooks/redux";
import { useUserSet } from "@/hooks/user-set";
import { Button } from "@/registry/new-york-v4/ui/button";
import { CfpHero, PageFrame, PremiumPanel, SupportGuidance } from "./components/cfp-layout";
import {
  AlreadyVerifiedScreen,
  LoadingScreen,
  NotFoundScreen,
  ResultsScreen,
  SessionMissingScreen,
} from "./components/result-screens";
import {
  nextStepHref,
  type ResolvedApiError,
  resolveApiError,
  shouldShowCfpSupportGuidance,
} from "./modules/support";
import { type CfpSearchForm, useForm } from "./use-form";

export const PsychologistCfpLogic = () => {
  const router = useRouter();
  const token = getToken();
  const storedUser = useAppSelector((state) => state.user);
  const { setter } = useUserSet(null);
  const { Form, formProps, hook } = useForm();
  const [apiError, setApiError] = useState<ResolvedApiError | null>(null);
  const [searchResult, setSearchResult] = useState<CfpSearchResponse | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

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

  const { search, confirm } = usePsychologistCfp({
    callbacks: {
      search: {
        onSuccess: (data) => {
          setApiError(null);
          setSearchResult(data);
          setSelectedKey(
            data.results.find((item) => item.active)?.key || data.results[0]?.key || null,
          );
        },
        onError: (error) => setApiError(resolveApiError(error)),
      },
      confirm: {
        onSuccess: () => {
          setApiError(null);
          toast.success("Verificação profissional concluída");
          router.replace(nextStepHref);
        },
        onError: (error) => setApiError(resolveApiError(error)),
      },
    },
  });

  const resetSearch = () => {
    setSearchResult(null);
    setSelectedKey(null);
    setApiError(null);
    hook.reset({ cpf: "" });
  };

  const handleSubmit = (data: CfpSearchForm) => {
    setApiError(null);
    setSearchResult(null);
    setSelectedKey(null);
    search.mutate({ cpf: data.cpf });
  };

  const handleConfirm = () => {
    if (!searchResult?.check_id || !selectedKey) return;

    setApiError(null);
    confirm.mutate({
      check_id: searchResult.check_id,
      result_key: selectedKey,
    });
  };

  if (search.isPending) return <LoadingScreen />;

  if (!token) {
    return <SessionMissingScreen />;
  }

  if (searchResult && !searchResult.found) {
    return <NotFoundScreen onRetry={resetSearch} />;
  }

  if (searchResult?.found) {
    return (
      <ResultsScreen
        apiError={apiError}
        isConfirming={confirm.isPending}
        onConfirm={handleConfirm}
        onRetry={resetSearch}
        onSelect={setSelectedKey}
        result={searchResult}
        selectedKey={selectedKey}
      />
    );
  }

  if (
    currentUser?.psychologist_profile?.crp_status === "aprovado" ||
    currentUser?.psychologist_profile?.cfp_verified_at
  ) {
    const manualApproved = Boolean(
      currentUser.psychologist_profile.crp_status === "aprovado" &&
        !currentUser.psychologist_profile.cfp_verified_at,
    );

    return (
      <AlreadyVerifiedScreen
        cpf={currentUser.psychologist_profile.cpf}
        manualApproved={manualApproved}
      />
    );
  }

  return (
    <PageFrame>
      <PremiumPanel>
        <CfpHero
          description="Para conceder o selo de verificado, precisamos confirmar que você é um profissional com registro ativo no Conselho Federal de Psicologia."
          title="Verificação Profissional"
        />

        {hidrate.isLoading ? (
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            Atualizando sua sessão
          </div>
        ) : null}

        {currentUser?.role && currentUser.role !== "psicologo" ? (
          <InlineAlert className="mt-6" title="Perfil não autorizado" variant="warning">
            Esta etapa é exclusiva para psicólogos cadastrados na Lectum.
          </InlineAlert>
        ) : null}

        <Form className="mt-8 grid gap-5" {...formProps} onSubmit={hook.handleSubmit(handleSubmit)}>
          {apiError ? (
            <InlineAlert title={"N\u00e3o foi poss\u00edvel consultar"} variant="error">
              <div className="grid gap-3">
                <p>{apiError.message}</p>
                {shouldShowCfpSupportGuidance(apiError) ? <SupportGuidance /> : null}
              </div>
            </InlineAlert>
          ) : null}

          <Button
            className="h-14 w-full rounded-full text-base shadow-[var(--lectum-shadow-soft)]"
            disabled={search.isPending || currentUser?.role === "paciente"}
            type="submit"
          >
            {search.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Consultar Registro
            {!search.isPending ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
          </Button>
        </Form>
      </PremiumPanel>
    </PageFrame>
  );
};

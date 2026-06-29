"use client";

import { ArrowRight, FileQuestion, Info, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/api/callers/auth";
import { usePsychologistCfp } from "@/api/callers/psychologist-cfp";
import type { CfpResult, CfpSearchResponse, user } from "@/api/generator/types";
import { formatCpf } from "@/components/controllers/utils";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Logo } from "@/components/ui/logo";
import { getToken } from "@/hooks/cookies/token";
import { useAppSelector } from "@/hooks/redux";
import { useUserSet } from "@/hooks/user-set";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { type CfpSearchForm, useForm } from "./use-form";

const nextStepHref = "/app/professional/profile/setup";

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const resolveApiError = (error: unknown) => {
  const apiError = error as ApiError;
  return (
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "") ||
    "Não foi possível consultar o CFP agora. Tente novamente."
  );
};

const CfpHeader = () => (
  <header className="border-b border-border bg-surface px-4 py-4 text-center">
    <h1 className="text-xl font-bold">Verificação Profissional</h1>
  </header>
);

const PageFrame = ({ children }: { children: ReactNode }) => (
  <main className="min-h-screen bg-[#f7f9fc] text-foreground">
    <CfpHeader />
    <section className="mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-[390px] flex-col px-4 py-8">
      {children}
    </section>
  </main>
);

const SecurityBadge = () => (
  <div className="mx-auto inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted shadow-sm">
    <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
    Segurança é nossa prioridade
  </div>
);

const LoadingScreen = () => (
  <PageFrame>
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="relative grid h-20 w-20 place-items-center rounded-full bg-primary-soft text-primary shadow-[0_0_35px_rgb(52_145_230_/_28%)]">
        <Loader2 className="absolute h-20 w-20 animate-spin" aria-hidden="true" />
        <ShieldCheck className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-10 text-2xl font-bold">Consultando dados...</h2>
      <p className="mt-4 max-w-[310px] text-base leading-7 text-muted">
        Estamos verificando suas informações no Conselho Federal de Psicologia. Isso pode levar
        alguns segundos.
      </p>
    </div>
    <div className="pb-6 text-center">
      <SecurityBadge />
      <Logo className="mx-auto mt-5 w-[178px] opacity-70" />
    </div>
  </PageFrame>
);

const NotFoundScreen = ({ onRetry }: { onRetry: () => void }) => (
  <PageFrame>
    <div className="flex flex-1 flex-col">
      <div className="mt-2 grid justify-items-center text-center">
        <div className="grid h-48 w-48 place-items-center rounded-[24px] bg-surface text-primary shadow-sm">
          <FileQuestion className="h-24 w-24" aria-hidden="true" />
          <p className="-mt-8 text-[10px] text-muted">Não encontramos seu registro.</p>
        </div>
      </div>

      <p className="mt-8 text-[17px] leading-8 text-muted">
        Ops! Não encontramos nenhum registro vinculado ao CPF informado. Por favor, verifique se os
        dados estão corretos e tente novamente.
      </p>
    </div>

    <div className="sticky bottom-0 -mx-4 border-t border-border bg-surface px-4 py-5 text-center">
      <Button className="h-14 w-full rounded-full text-base shadow-lg" onClick={onRetry}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Tentar novamente
      </Button>
      <Link className="mt-4 inline-block text-sm font-medium text-muted" href="/app/profile">
        Problemas? Fale com o suporte
      </Link>
    </div>
  </PageFrame>
);

const ResultField = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-[12px] border border-border bg-surface-muted px-4 py-4">
    <p className="text-xs font-bold uppercase tracking-wide text-subtle">{label}</p>
    <div className="mt-2 text-base font-semibold text-foreground">{value}</div>
  </div>
);

const ResultCard = ({
  result,
  selected,
  onSelect,
}: {
  result: CfpResult;
  selected: boolean;
  onSelect: () => void;
}) => (
  <button
    aria-pressed={selected}
    className={cn(
      "w-full rounded-[16px] border bg-surface p-6 text-left shadow-[var(--lectum-shadow-soft)] transition",
      selected ? "border-primary ring-4 ring-primary/10" : "border-border hover:border-primary/40",
    )}
    onClick={onSelect}
    type="button"
  >
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-subtle">Nome</p>
      <h2 className="mt-2 text-2xl font-bold">{result.nome || "Nome não informado"}</h2>
    </div>

    <div className="mt-5 grid gap-3">
      <ResultField label="Regional" value={result.nome_regional || "Não informado"} />
      <ResultField label="Registro" value={result.registro || "Não informado"} />
      <ResultField
        label="Situação"
        value={
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
              result.active ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
            )}
          >
            <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
            {result.situacao || "Não informada"}
          </span>
        }
      />
      <ResultField label="Data de inscrição" value={result.data_inscricao || "Não informada"} />
    </div>

    <p className="mt-6 border-t border-border pt-5 text-sm text-muted">
      Dados validados via consulta pública do CFP pela InfoSimples.
    </p>
  </button>
);

const ResultsScreen = ({
  result,
  selectedKey,
  onSelect,
  onConfirm,
  onRetry,
  isConfirming,
  apiError,
}: {
  result: CfpSearchResponse;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onConfirm: () => void;
  onRetry: () => void;
  isConfirming: boolean;
  apiError: string | null;
}) => {
  const selected = result.results.find((item) => item.key === selectedKey) || null;

  return (
    <PageFrame>
      <div className="flex flex-1 flex-col">
        <p className="mt-1 text-base leading-7 text-muted">
          Encontramos o seguinte registro vinculado ao seu CPF. Por favor, confirme se os dados
          estão corretos.
        </p>

        <div className="mt-8 grid gap-4">
          {result.results.map((item) => (
            <ResultCard
              key={item.key}
              result={item}
              selected={item.key === selectedKey}
              onSelect={() => onSelect(item.key)}
            />
          ))}
        </div>

        {selected && !selected.active ? (
          <InlineAlert className="mt-5" title="Registro não ativo" variant="warning">
            Este registro foi retornado pela consulta real, mas não está ativo para aprovação
            automática. Procure o suporte para análise manual.
          </InlineAlert>
        ) : null}

        {apiError ? (
          <InlineAlert className="mt-5" title="Não foi possível confirmar" variant="error">
            {apiError}
          </InlineAlert>
        ) : null}
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-surface px-4 py-5 text-center">
        <Button
          className="h-14 w-full rounded-full text-base shadow-lg"
          disabled={!selected?.active || isConfirming}
          onClick={onConfirm}
        >
          {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {isConfirming ? "Confirmando" : "Sim, sou eu"}
        </Button>
        <button className="mt-4 text-sm font-medium text-muted" onClick={onRetry} type="button">
          Não é você? Tente outro CPF
        </button>
      </div>
    </PageFrame>
  );
};

export const PsychologistCfpLogic = () => {
  const router = useRouter();
  const token = getToken();
  const storedUser = useAppSelector((state) => state.user);
  const { setter } = useUserSet(null);
  const { Form, formProps, hook } = useForm();
  const [apiError, setApiError] = useState<string | null>(null);
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
    return (
      <PageFrame>
        <div className="flex flex-1 flex-col justify-center">
          <InlineAlert title="Sessão não encontrada" variant="error">
            Entre novamente para validar seu cadastro profissional.
          </InlineAlert>
          <Button asChild className="mt-5 w-full">
            <Link href="/auth/login?role=psicologo">Ir para login</Link>
          </Button>
        </div>
      </PageFrame>
    );
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

  return (
    <PageFrame>
      <div className="flex flex-1 flex-col">
        <div className="grid justify-items-center text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-primary-soft text-primary">
            <ShieldCheck className="h-9 w-9" aria-hidden="true" />
          </div>

          <h2 className="mt-8 text-[25px] font-bold leading-tight">Verificação Profissional</h2>
          <p className="mt-4 max-w-[340px] text-base leading-7 text-muted">
            Informe seu CPF para buscarmos seus dados de registro automaticamente no Conselho
            Federal de Psicologia (CFP).
          </p>
        </div>

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

        <Form className="mt-9 grid gap-5" {...formProps} onSubmit={hook.handleSubmit(handleSubmit)}>
          {apiError ? (
            <InlineAlert title="Não foi possível consultar" variant="error">
              {apiError}
            </InlineAlert>
          ) : null}

          <div className="flex gap-3 rounded-[14px] border border-border bg-surface px-4 py-4 text-sm leading-6 text-muted shadow-sm">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <p>
              Seus dados estão seguros e serão utilizados apenas para fins de validação
              profissional. Garantimos total privacidade de suas informações de acordo com as normas
              vigentes.
            </p>
          </div>

          <div className="mt-auto pt-10">
            <Button
              className="h-14 w-full rounded-full bg-[#0f172a] text-base shadow-lg hover:bg-[#111827]"
              disabled={search.isPending || currentUser?.role === "paciente"}
              type="submit"
            >
              {search.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Consultar Registro
              {!search.isPending ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
            </Button>
          </div>
        </Form>
      </div>

      {currentUser?.psychologist_profile?.cfp_verified_at ? (
        <InlineAlert className="mt-5" title="Registro já confirmado" variant="success">
          CPF {formatCpf(currentUser.psychologist_profile.cpf)} já possui confirmação CFP real.
        </InlineAlert>
      ) : null}
    </PageFrame>
  );
};

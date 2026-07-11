"use client";

import {
  ArrowRight,
  CheckCircle2,
  FileQuestion,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/api/callers/auth";
import { usePsychologistCfp } from "@/api/callers/psychologist-cfp";
import type { CfpResult, CfpSearchResponse, user } from "@/api/generator/types";
import { formatCpf } from "@/components/controllers/utils";
import { InlineAlert } from "@/components/ui/inline-alert";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { getToken } from "@/hooks/cookies/token";
import { useAppSelector } from "@/hooks/redux";
import { useUserSet } from "@/hooks/user-set";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { type CfpSearchForm, useForm } from "./use-form";

const nextStepHref = "/app/professional/profile/setup";
const supportMessage =
  "Ol\u00e1, preciso de ajuda com a verifica\u00e7\u00e3o profissional CFP/CRP na Lectum.";
const supportHref = `https://wa.me/5537998739534?text=${encodeURIComponent(supportMessage)}`;
const supportLinkProps = {
  href: supportHref,
  rel: "noopener noreferrer",
  target: "_blank",
} as const;
const cfpSystemErrorMessage =
  "N\u00e3o foi poss\u00edvel consultar o cadastro do Conselho Federal de Psicologia agora.";
const genericStatusErrorPattern = /^Request failed with status code \d+$/i;

type ApiError = Error & {
  data?: unknown;
  response?: {
    data?: unknown;
    status?: unknown;
  };
};

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringValue = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const getStatusValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const resolveApiError = (error: unknown) => {
  const apiError = error as ApiError;
  const data = isRecord(apiError?.data) ? apiError.data : {};
  const responseData = isRecord(apiError?.response?.data) ? apiError.response.data : {};
  const status =
    getStatusValue(data.status) ||
    getStatusValue(responseData.status) ||
    getStatusValue(apiError?.response?.status);
  const rawMessage =
    getStringValue(data.error) ||
    getStringValue(data.message) ||
    getStringValue(responseData.error) ||
    getStringValue(responseData.message) ||
    (error instanceof Error ? error.message : undefined);
  const shouldUseCfpSystemMessage =
    typeof status === "number" &&
    status >= 500 &&
    (!rawMessage || genericStatusErrorPattern.test(rawMessage));

  return {
    code: getStringValue(data.code) || getStringValue(responseData.code),
    message:
      (shouldUseCfpSystemMessage ? cfpSystemErrorMessage : rawMessage) ||
      "N\u00e3o foi poss\u00edvel consultar o CFP agora. Tente novamente.",
    status,
  };
};

type ResolvedApiError = ReturnType<typeof resolveApiError>;

const supportableCfpErrorCodes = new Set([
  "cfp_provider_config_error",
  "cfp_provider_error",
  "cfp_provider_rate_limited",
  "cfp_provider_unavailable",
]);

const shouldShowCfpSupportGuidance = (error?: ResolvedApiError | null) =>
  Boolean(
    error &&
      ((error.code && supportableCfpErrorCodes.has(error.code)) ||
        (typeof error.status === "number" && error.status >= 500)),
  );

const formatCfpRegistrationDate = (value?: string | null) => {
  const rawValue = value?.trim();

  if (!rawValue) return "Não informada";

  const alreadyFormattedDate = rawValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (alreadyFormattedDate) return rawValue;

  const isoDate = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return `${day}/${month}/${year}`;
  }

  const parsedDate = new Date(rawValue);
  if (!Number.isNaN(parsedDate.getTime())) {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(parsedDate);
  }

  return rawValue;
};

const SupportFooterLink = () => (
  <p className="px-2 text-center text-sm font-medium text-muted">
    Problemas?{" "}
    <a
      {...supportLinkProps}
      className="font-semibold text-primary underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      Fale com o suporte
    </a>
  </p>
);

const SupportGuidance = () => (
  <div className="grid gap-3">
    <Button asChild className="h-11 w-full rounded-full" variant="outline">
      <a {...supportLinkProps}>{"Fale com o suporte pelo WhatsApp"}</a>
    </Button>
  </div>
);

const PageFrame = ({ children }: { children: ReactNode }) => (
  <PrivateTemplate allowAnonymous showHeader={false} showMobileNavigation={false}>
    <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-4xl">
      {children}
      <SupportFooterLink />
    </section>
  </PrivateTemplate>
);

const PremiumPanel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-7 shadow-[var(--lectum-shadow-soft)] md:px-8 md:py-9",
      className,
    )}
  >
    <div className="relative">{children}</div>
  </div>
);

const CfpHero = ({
  description,
  eyebrow = "Selo de verificado",
  icon: Icon = VerifiedBadgeIcon,
  title,
  variant = "primary",
}: {
  description: ReactNode;
  eyebrow?: string;
  icon?: HeroIcon;
  title: string;
  variant?: "primary" | "success" | "warning";
}) => {
  const isVerifiedBadgeIcon = Icon === VerifiedBadgeIcon;
  const tone = {
    primary: "bg-primary text-white ring-primary-soft/70",
    success: "bg-success/10 text-success ring-success/10",
    warning: "bg-warning/10 text-warning ring-warning/10",
  }[variant];

  return (
    <header className="grid justify-items-center text-center">
      <div
        className={cn(
          "grid h-20 w-20 place-items-center rounded-full shadow-[var(--lectum-shadow-soft)] ring-8 md:h-24 md:w-24",
          isVerifiedBadgeIcon ? "bg-transparent shadow-none ring-0" : tone,
        )}
      >
        <Icon
          className={cn(
            "h-10 w-10 md:h-12 md:w-12",
            isVerifiedBadgeIcon && "h-16 w-16 md:h-20 md:w-20",
          )}
          aria-hidden="true"
        />
      </div>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground md:text-4xl">{title}</h1>
      <div className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted md:text-lg">
        {description}
      </div>
    </header>
  );
};

const LoadingScreen = () => (
  <PageFrame>
    <PremiumPanel className="md:max-w-3xl md:justify-self-center">
      <CfpHero
        description="Estamos verificando suas informações no Conselho Federal de Psicologia. A consulta real pode levar até um minuto."
        title="Consultando seus dados"
      />
      <div className="mx-auto mt-8 grid max-w-md justify-items-center gap-4 rounded-[24px] border border-border bg-surface-muted px-5 py-6 text-center">
        <div className="relative grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary">
          <Loader2 className="absolute h-16 w-16 animate-spin" aria-hidden="true" />
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-muted">Conexão segura com a consulta CFP</p>
      </div>
    </PremiumPanel>
  </PageFrame>
);

const NotFoundScreen = ({ onRetry }: { onRetry: () => void }) => (
  <PageFrame>
    <PremiumPanel className="md:max-w-3xl md:justify-self-center">
      <CfpHero
        description="Não encontramos um registro ativo vinculado ao CPF informado. Confira os dados e tente novamente."
        eyebrow="Validação pendente"
        icon={FileQuestion}
        title="Registro não encontrado"
        variant="warning"
      />

      <InlineAlert className="mt-7" title="Antes de seguir" variant="warning">
        A assinatura continua ativa. Você pode tentar outro CPF ou falar com o suporte para análise
        manual se o cadastro estiver correto.
      </InlineAlert>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Button className="h-14 rounded-full text-base" onClick={onRetry}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Tentar novamente
        </Button>
        <Button asChild className="h-14 rounded-full text-base" variant="outline">
          <a {...supportLinkProps}>Falar com suporte</a>
        </Button>
      </div>
    </PremiumPanel>
  </PageFrame>
);

const AlreadyVerifiedScreen = ({ cpf }: { cpf?: string | null }) => (
  <PageFrame>
    <PremiumPanel className="md:max-w-3xl md:justify-self-center">
      <CfpHero
        description={
          cpf
            ? `O CPF ${formatCpf(cpf)} já possui confirmação profissional via CFP.`
            : "Seu cadastro profissional já possui confirmação real via CFP."
        }
        eyebrow="Validação concluída"
        icon={ShieldCheck}
        title="Registro já confirmado"
        variant="success"
      />

      <div className="mt-8 rounded-[24px] border border-success/20 bg-success/10 px-5 py-5 text-center text-success">
        <CheckCircle2 className="mx-auto h-8 w-8" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold">
          Próximo passo: configurar seu perfil profissional para aparecer na Lectum.
        </p>
      </div>

      <Button asChild className="mt-7 h-14 w-full rounded-full text-base">
        <Link href={nextStepHref}>
          Configurar perfil
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </PremiumPanel>
  </PageFrame>
);

const ResultField = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-[18px] border border-border bg-surface-muted px-4 py-4">
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
      "w-full rounded-[24px] border bg-surface p-5 text-left shadow-[var(--lectum-shadow-soft)] transition md:p-6",
      selected ? "border-primary ring-4 ring-primary/10" : "border-border hover:border-primary/40",
    )}
    onClick={onSelect}
    type="button"
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-subtle">Nome encontrado</p>
        <h2 className="mt-2 text-2xl font-bold text-foreground">
          {result.nome || "Nome não informado"}
        </h2>
      </div>
      {selected ? (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </span>
      ) : null}
    </div>

    <div className="mt-5 grid gap-3 md:grid-cols-2">
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
      <ResultField
        label="Data de inscrição"
        value={formatCfpRegistrationDate(result.data_inscricao)}
      />
    </div>

    <p className="mt-5 border-border border-t pt-5 text-sm leading-6 text-muted">
      Dados retornados pela consulta pública do CFP.
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
  apiError: ResolvedApiError | null;
}) => {
  const selected = result.results.find((item) => item.key === selectedKey) || null;

  return (
    <PageFrame>
      <PremiumPanel>
        <CfpHero
          description="Encontramos o registro abaixo no Conselho Federal de Psicologia. Confirme se os dados pertencem a você para ativar a validação profissional."
          title="Confirme seu registro"
        />

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
            {apiError.message}
          </InlineAlert>
        ) : null}

        <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Button
            className="h-14 rounded-full text-base"
            disabled={!selected?.active || isConfirming}
            onClick={onConfirm}
          >
            {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {isConfirming ? "Confirmando" : "Sim, sou eu"}
            {!isConfirming ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
          </Button>
          <Button
            className="h-14 rounded-full text-base"
            onClick={onRetry}
            type="button"
            variant="outline"
          >
            Tentar outro CPF
          </Button>
        </div>
      </PremiumPanel>
    </PageFrame>
  );
};

const SessionMissingScreen = () => (
  <PageFrame>
    <PremiumPanel className="md:max-w-3xl md:justify-self-center">
      <CfpHero
        description="Entre novamente para validar seu cadastro profissional com segurança."
        title="Sessão necessária"
        variant="warning"
      />
      <Button asChild className="mt-7 h-14 w-full rounded-full text-base">
        <Link href="/auth/login?role=psicologo">Ir para login</Link>
      </Button>
    </PremiumPanel>
  </PageFrame>
);

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
    return <AlreadyVerifiedScreen cpf={currentUser.psychologist_profile.cpf} />;
  }

  return (
    <PageFrame>
      <PremiumPanel>
        <CfpHero
          description="Antes de liberar a configuração completa do perfil, precisamos confirmar que você é um profissional com registro ativo no Conselho Federal de Psicologia."
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

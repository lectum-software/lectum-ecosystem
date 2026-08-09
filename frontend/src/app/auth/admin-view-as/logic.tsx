"use client";

import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/api/callers/auth";
import { Logo } from "@/components/ui/logo";
import { useUserSet } from "@/hooks/user-set";
import { Button } from "@/registry/new-york-v4/ui/button";
import { CenterTemplate } from "@/templates/center";
import {
  clearAdminViewAsSession,
  normalizeAdminReturnUrl,
  writeAdminViewAsSession,
} from "@/utils/admin-view-as";
import { normalizeSafeInternalRedirect } from "@/utils/safe-redirect";

type ParsedViewAsHash = {
  adminReturnUrl: string | null;
  expiresAt: string;
  startPath: string;
  subjectId: string;
  subjectName: string;
  subjectRole: "paciente" | "psicologo";
  token: string;
};

const MAX_VIEW_AS_TOKEN_LENGTH = 8192;
const MAX_VIEW_AS_TTL_SECONDS = 30 * 60;
const MAX_VIEW_AS_SUBJECT_ID_LENGTH = 128;
const MAX_VIEW_AS_SUBJECT_NAME_LENGTH = 160;
const VIEW_AS_STORAGE_ERROR =
  "Não foi possível preparar a visualização administrativa neste navegador.";

const hasControlCharacters = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

const DEFAULT_START_PATH_BY_ROLE: Record<ParsedViewAsHash["subjectRole"], string> = {
  paciente: "/app/perfil",
  psicologo: "/app/profissional/perfil/configurar",
};

const sanitizeRelativePath = (value: string | null, fallback: string) => {
  return normalizeSafeInternalRedirect(value, fallback) || fallback;
};

const parseHash = (): ParsedViewAsHash | null => {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const token = params.get("token")?.trim() || null;
  const role = params.get("role");
  const subjectId = params.get("subjectId")?.trim() || null;
  const subjectName = params.get("subjectName")?.trim() || "usuário";
  const expiresInSeconds = Number(params.get("expiresIn") || 0);

  if (
    !token ||
    token.length > MAX_VIEW_AS_TOKEN_LENGTH ||
    hasControlCharacters(token) ||
    (role !== "paciente" && role !== "psicologo") ||
    !subjectId ||
    subjectId.length > MAX_VIEW_AS_SUBJECT_ID_LENGTH ||
    hasControlCharacters(subjectId) ||
    subjectName.length > MAX_VIEW_AS_SUBJECT_NAME_LENGTH ||
    hasControlCharacters(subjectName) ||
    !Number.isInteger(expiresInSeconds) ||
    expiresInSeconds <= 0 ||
    expiresInSeconds > MAX_VIEW_AS_TTL_SECONDS
  ) {
    return null;
  }

  const fallbackStartPath = DEFAULT_START_PATH_BY_ROLE[role];
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  return {
    adminReturnUrl: normalizeAdminReturnUrl(params.get("adminReturnUrl")),
    expiresAt,
    startPath: sanitizeRelativePath(params.get("startPath"), fallbackStartPath),
    subjectId,
    subjectName,
    subjectRole: role,
    token,
  };
};

export const AdminViewAsLogic = () => {
  const router = useRouter();
  const [parsed] = useState<ParsedViewAsHash | null>(() => parseHash());
  const exchangeStartedRef = useRef(false);
  const completedRef = useRef(false);
  const { setter } = useUserSet(null);
  const { hydrateWithBearer: hidrate } = useAuth();
  const exchangeViewAsToken = hidrate.mutate;
  const error = !parsed
    ? "Link de visualização administrativa inválido ou expirado."
    : hidrate.isError
      ? "Não foi possível validar a sessão de visualização administrativa."
      : null;

  useEffect(() => {
    if (!parsed || hidrate.isError) {
      clearAdminViewAsSession();
    }
  }, [hidrate.isError, parsed]);

  useEffect(() => {
    if (!parsed || exchangeStartedRef.current) return;

    exchangeStartedRef.current = true;

    const sessionWritten = writeAdminViewAsSession({
      adminReturnUrl: parsed.adminReturnUrl,
      expiresAt: parsed.expiresAt,
      mode: "admin_view_as",
      readOnly: true,
      startPath: parsed.startPath,
      startedAt: new Date().toISOString(),
      subjectId: parsed.subjectId,
      subjectName: parsed.subjectName,
      subjectRole: parsed.subjectRole,
    });
    window.history.replaceState(null, "", "/auth/admin-view-as");
    if (!sessionWritten) {
      router.replace(
        `/auth/error?error=${encodeURIComponent(VIEW_AS_STORAGE_ERROR)}&clearSession=1`,
      );
      return;
    }

    exchangeViewAsToken(parsed.token);
  }, [exchangeViewAsToken, parsed, router]);

  useEffect(() => {
    if (!parsed || !hidrate.data || completedRef.current) return;

    completedRef.current = true;
    setter(hidrate.data);
    router.replace(parsed.startPath);
  }, [hidrate.data, parsed, router, setter]);

  if (error) {
    return (
      <CenterTemplate>
        <div className="grid w-full justify-items-center gap-4 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-7 text-center shadow-[var(--lectum-shadow-soft)]">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="grid gap-1.5">
            <h1 className="text-xl font-bold text-foreground">Visualização indisponível</h1>
            <p className="text-sm leading-6 text-muted">{error}</p>
          </div>
          <Button asChild className="w-full">
            <Link href="/auth/login">Ir para o login</Link>
          </Button>
        </div>
      </CenterTemplate>
    );
  }

  return (
    <CenterTemplate>
      <div className="grid w-full justify-items-center gap-5 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-7 text-center shadow-[var(--lectum-shadow-soft)]">
        <Logo className="w-[132px] sm:w-[144px]" />
        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
          {hidrate.isPending || !parsed ? (
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          )}
        </span>
        <div className="grid gap-1.5">
          <h1 className="text-xl font-bold text-foreground">Preparando visualização</h1>
          <p className="text-sm leading-6 text-muted">
            Validando sessão auditada em modo somente leitura.
          </p>
        </div>
      </div>
    </CenterTemplate>
  );
};

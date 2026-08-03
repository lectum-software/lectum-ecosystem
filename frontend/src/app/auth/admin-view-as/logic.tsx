"use client";

import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/api/callers/auth";
import { Logo } from "@/components/ui/logo";
import { setToken } from "@/hooks/cookies/token";
import { useUserSet } from "@/hooks/user-set";
import { Button } from "@/registry/new-york-v4/ui/button";
import { CenterTemplate } from "@/templates/center";
import { writeAdminViewAsSession } from "@/utils/admin-view-as";

type ParsedViewAsHash = {
  adminReturnUrl: string | null;
  expiresAt: string | null;
  startPath: string;
  subjectId: string;
  subjectName: string;
  subjectRole: "paciente" | "psicologo";
  token: string;
};

const DEFAULT_START_PATH_BY_ROLE: Record<ParsedViewAsHash["subjectRole"], string> = {
  paciente: "/app/perfil",
  psicologo: "/app/profissional/perfil/configurar",
};

const sanitizeRelativePath = (value: string | null, fallback: string) => {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
};

const sanitizeReturnUrl = (value: string | null) => {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    return url.toString();
  } catch {
    return value.startsWith("/") && !value.startsWith("//") ? value : null;
  }
};

const parseHash = (): ParsedViewAsHash | null => {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const token = params.get("token");
  const role = params.get("role");
  const subjectId = params.get("subjectId");
  const subjectName = params.get("subjectName") || "usuário";
  const expiresInSeconds = Number(params.get("expiresIn") || 0);

  if (!token || (role !== "paciente" && role !== "psicologo") || !subjectId) {
    return null;
  }

  const fallbackStartPath = DEFAULT_START_PATH_BY_ROLE[role];
  const expiresAt =
    Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
      ? new Date(Date.now() + expiresInSeconds * 1000).toISOString()
      : null;

  return {
    adminReturnUrl: sanitizeReturnUrl(params.get("adminReturnUrl")),
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
  const completedRef = useRef(false);
  const { setter } = useUserSet(null);
  const { hidrate } = useAuth({ enableHidrate: Boolean(parsed?.token) });
  const error = !parsed
    ? "Link de visualização administrativa inválido ou expirado."
    : hidrate.isError
      ? "Não foi possível validar a sessão de visualização administrativa."
      : null;

  useEffect(() => {
    if (!parsed) return;

    setToken(parsed.token);
    writeAdminViewAsSession({
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
  }, [parsed]);

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
          {hidrate.isLoading || !parsed ? (
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

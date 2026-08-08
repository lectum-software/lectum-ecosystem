"use client";

import { Eye, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { revokeSession } from "@/hooks/cookies/signout";
import { cn } from "@/lib/utils";
import {
  ADMIN_VIEW_AS_STORAGE_EVENT,
  type AdminViewAsSession,
  clearAdminViewAsSession,
  normalizeAdminReturnUrl,
  readAdminViewAsSession,
} from "@/utils/admin-view-as";

const roleLabels: Record<AdminViewAsSession["subjectRole"], string> = {
  paciente: "paciente",
  psicologo: "psicólogo",
};

const formatExpiresAt = (session: AdminViewAsSession) => {
  if (!session.expiresAt) return null;

  const date = new Date(session.expiresAt);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const AdminViewAsBanner = () => {
  const [session, setSession] = useState<AdminViewAsSession | null>(null);

  useEffect(() => {
    const syncSession = () => setSession(readAdminViewAsSession());

    syncSession();
    window.addEventListener("storage", syncSession);
    window.addEventListener(ADMIN_VIEW_AS_STORAGE_EVENT, syncSession);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener(ADMIN_VIEW_AS_STORAGE_EVENT, syncSession);
    };
  }, []);

  if (!session) return null;

  const expiresAt = formatExpiresAt(session);

  const exitViewAs = async () => {
    const returnUrl = normalizeAdminReturnUrl(session.adminReturnUrl) || "/auth/login";
    await revokeSession();
    clearAdminViewAsSession();
    window.location.href = returnUrl;
  };

  return (
    <div
      className={cn(
        "fixed top-3 right-3 left-3 z-[90] mx-auto max-w-3xl rounded-2xl border border-primary/30 bg-white/95 px-3 py-3 text-foreground shadow-[0_16px_45px_rgba(15,23,42,0.16)] backdrop-blur",
        "sm:left-1/2 sm:right-auto sm:w-[min(720px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:px-4",
      )}
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <Eye className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-foreground">
              Visualizando como {roleLabels[session.subjectRole]} · modo somente leitura
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-muted">
              {session.subjectName}
              {expiresAt ? ` · sessão expira às ${expiresAt}` : ""}
            </p>
          </div>
        </div>
        <button
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary-soft px-3 text-sm font-extrabold text-primary transition hover:border-primary/40 hover:bg-primary-soft/80 sm:w-auto"
          onClick={exitViewAs}
          type="button"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair da visualização
        </button>
      </div>
    </div>
  );
};

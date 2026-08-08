"use client";

import { Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAccount } from "@/api/callers/account";
import { getSafeApiErrorMessage } from "@/api/errors";
import { components } from "@/components/controllers";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useSignOut } from "@/hooks/cookies/signout";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { normalizeTrustedApiUrl } from "@/utils/trusted-navigation";
import { useDeleteAccountForm } from "./use-delete-account-form";

type ApiErrorData = {
  code?: string;
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

type AccountDeleteSectionProps = {
  className?: string;
};

const resolveDeleteAccountError = (error: unknown) => {
  const apiError = error as ApiError;
  const code = apiError?.data?.code;
  const rawMessage = getSafeApiErrorMessage(error, "");
  const normalized = rawMessage.toLowerCase();

  if (code === "account_delete_google_reauth_required") {
    return "Confirme sua identidade com o Google antes de excluir a conta.";
  }

  if (code === "account_delete_identity_unavailable") {
    return "Não há método de autenticação disponível para confirmar a exclusão desta conta.";
  }

  if (normalized.includes("assinatura") || normalized.includes("pagamento")) {
    return "Cancele ou regularize a assinatura paga antes de excluir a conta.";
  }

  if (normalized.includes("senha atual") || normalized.includes("incorreta")) {
    return "A senha atual não confere. Revise e tente novamente.";
  }

  if (normalized.includes("excluir")) {
    return "Digite EXCLUIR para confirmar a exclusão.";
  }

  if (normalized.includes("google")) {
    return rawMessage || "Não foi possível confirmar sua identidade com o Google.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para excluir a conta.";
  }

  return rawMessage || "Não foi possível excluir sua conta agora.";
};

export function AccountDeleteSection({ className }: AccountDeleteSectionProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { out } = useSignOut();
  const googleReauthParam = searchParams.get("deleteReauth");
  const hasGoogleReauthParam = googleReauthParam === "ok";
  const [isOpen, setIsOpen] = useState(hasGoogleReauthParam);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [googleReauthReady] = useState(hasGoogleReauthParam);

  const account = useAccount({
    enableSecurity: isOpen || googleReauthParam === "ok",
    callbacks: {
      createDeleteGoogleIntent: {
        onError: (error) => setDeleteAccountError(resolveDeleteAccountError(error)),
        onSuccess: (data) => {
          const url = normalizeTrustedApiUrl(data.url);
          if (!url) {
            setDeleteAccountError("Não foi possível iniciar a confirmação com o Google.");
            return;
          }

          window.location.assign(url);
        },
      },
      deleteAccount: {
        onError: (error) => setDeleteAccountError(resolveDeleteAccountError(error)),
        onSuccess: () => out("/auth/login"),
      },
    },
  });

  const hasPassword = account.security.data?.has_password ?? true;
  const provider = account.security.data?.provider;
  const isGoogleOnlyAccount = provider === "google" && !hasPassword;
  const canUseGoogleReauth = Boolean(
    isGoogleOnlyAccount && account.security.data?.google.available,
  );
  const form = useDeleteAccountForm(hasPassword);

  const googleCallbackUrl = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("deleteReauth", "ok");
    const query = params.toString();

    return `${pathname}${query ? `?${query}` : ""}`;
  }, [pathname, searchParams]);

  const closeModal = useCallback(() => {
    if (account.deleteAccount.isPending) return;

    setIsOpen(false);
    setDeleteAccountError(null);
    form.hook.reset();
  }, [account.deleteAccount.isPending, form.hook]);

  const handleGoogleReauth = () => {
    setDeleteAccountError(null);
    account.createDeleteGoogleIntent.mutate({
      callback_url: googleCallbackUrl,
    });
  };

  const onSubmit = form.hook.handleSubmit((values) => {
    setDeleteAccountError(null);

    if (isGoogleOnlyAccount && !googleReauthReady) {
      setDeleteAccountError("Confirme sua identidade com o Google antes de excluir a conta.");
      return;
    }

    account.deleteAccount.mutate({
      confirmation: values.confirmation.trim(),
      ...(hasPassword ? { current_password: values.current_password?.trim() || "" } : {}),
    });
  });

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeModal]);

  const portalTarget = typeof document !== "undefined" ? document.body : null;
  const modal = isOpen ? (
    <div
      aria-labelledby="account-delete-title"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-media-background/35 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
    >
      <button
        aria-label="Cancelar exclusão de conta"
        className="absolute inset-0 cursor-default"
        onClick={closeModal}
        type="button"
      />
      <section className="relative z-10 grid max-h-[90vh] w-full max-w-lg gap-5 overflow-y-auto rounded-[28px] border border-danger/20 bg-surface p-5 shadow-lectum-soft sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              className="text-xl font-extrabold leading-7 text-foreground"
              id="account-delete-title"
            >
              Tem certeza que deseja excluir sua conta?
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Essa ação é permanente e não poderá ser desfeita. Seus dados, publicações, comentários
              e demais informações serão removidos da plataforma.
            </p>
          </div>
        </div>

        {account.security.isLoading || account.security.isPending ? (
          <div className="rounded-2xl border border-border bg-surface-muted p-4">
            <LoadingState label="Verificando segurança da conta" />
          </div>
        ) : null}

        {account.security.isError ? (
          <InlineAlert title="Não foi possível verificar a conta" variant="error">
            {resolveDeleteAccountError(account.security.error)}
          </InlineAlert>
        ) : null}

        {isGoogleOnlyAccount ? (
          <InlineAlert
            title={googleReauthReady ? "Identidade confirmada" : "Confirmação com Google"}
            variant={googleReauthReady ? "success" : "warning"}
          >
            {googleReauthReady
              ? "Sua identidade foi confirmada com o Google nesta sessão."
              : "Esta conta usa login Google. Confirme sua identidade antes de excluir definitivamente."}
          </InlineAlert>
        ) : null}

        {isGoogleOnlyAccount && !googleReauthReady ? (
          <Button
            className="w-full"
            disabled={
              account.createDeleteGoogleIntent.isPending ||
              account.security.isLoading ||
              !canUseGoogleReauth
            }
            onClick={handleGoogleReauth}
            type="button"
            variant="outline"
          >
            {account.createDeleteGoogleIntent.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Confirmar com Google
          </Button>
        ) : null}

        <form className="grid gap-4" noValidate onSubmit={onSubmit}>
          <div className="grid gap-1">
            {form.formProps.fields.map((field) => {
              if (field.hide) return null;

              const Component = components[field.field];
              if (!Component) return null;

              return (
                <Component
                  control={form.hook.control}
                  key={`account-delete-${String(field.name)}`}
                  {...field}
                />
              );
            })}
          </div>

          {deleteAccountError ? (
            <InlineAlert title="Exclusão bloqueada" variant="error">
              {deleteAccountError}
            </InlineAlert>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              disabled={account.deleteAccount.isPending}
              onClick={closeModal}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              className="bg-danger text-primary-foreground hover:bg-danger/90"
              disabled={
                account.deleteAccount.isPending ||
                account.security.isLoading ||
                (isGoogleOnlyAccount && !googleReauthReady)
              }
              type="submit"
            >
              {account.deleteAccount.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              Excluir conta
            </Button>
          </div>
        </form>
      </section>
    </div>
  ) : null;

  return (
    <>
      <section className={cn("grid gap-3 border-t border-danger/15 pt-6 text-center", className)}>
        <button
          className="mx-auto inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/10"
          onClick={() => {
            setIsOpen(true);
            setDeleteAccountError(null);
          }}
          type="button"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Excluir minha conta
        </button>
      </section>
      {portalTarget ? createPortal(modal, portalTarget) : null}
    </>
  );
}

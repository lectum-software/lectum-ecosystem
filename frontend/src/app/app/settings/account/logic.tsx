"use client";

import {
  AtSign,
  ExternalLink,
  KeyRound,
  Link2,
  Loader2,
  type LucideIcon,
  Save,
  ShieldCheck,
  Unlink2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useAccount } from "@/api/callers/account";
import { getSafeApiErrorMessage } from "@/api/errors";
import { components } from "@/components/controllers";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import type { Field } from "@/hooks/form";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import * as userActions from "@/store/modules/user/actions";
import { PrivateTemplate } from "@/templates/private";
import { normalizeTrustedApiUrl } from "@/utils/trusted-navigation";
import { type AccountForm, emailFields, passwordFields, useAccountForm } from "./use-form";

const resolveAccountError = (error: unknown, fallback: string) => {
  const rawMessage = getSafeApiErrorMessage(error, "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("senha atual") || normalized.includes("incorreta")) {
    return "A senha atual não confere. Revise e tente novamente.";
  }

  if (normalized.includes("e-mail") && normalized.includes("uso")) {
    return "Este e-mail já está sendo usado em outra conta.";
  }

  if (normalized.includes("google") && normalized.includes("mesmo e-mail")) {
    return "Use no Google o mesmo e-mail da sua conta Lectum.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para alterar a conta.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar ao serviço agora. Tente novamente em instantes.";
  }

  return rawMessage || fallback;
};

const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase() || "";

const GoogleGlyph = () => (
  <span
    aria-hidden="true"
    className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-4xl font-black text-primary"
  >
    G
  </span>
);

const SectionTitle = ({ icon: Icon, title }: { icon: LucideIcon; title: string }) => (
  <div className="flex items-center gap-2 px-1 text-xs font-black uppercase tracking-[0.12em] text-muted">
    <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
    <span>{title}</span>
  </div>
);

const FieldList = ({
  fields,
  form,
}: {
  fields: Field<AccountForm>[];
  form: ReturnType<typeof useAccountForm>;
}) => {
  return (
    <>
      {fields.map((field) => {
        const Component = components[field.field];

        return (
          <Component
            control={form.hook.control}
            disabled={field.disabled}
            key={String(field.name)}
            readOnly={field.readOnly}
            {...field}
          />
        );
      })}
    </>
  );
};

const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <section
    className={cn(
      "grid min-w-0 gap-4 rounded-[22px] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)]",
      className,
    )}
  >
    {children}
  </section>
);

const GoogleConnectionPanel = ({
  connected,
  disabled,
  hasPassword,
  isLinking,
  isUnlinking,
  manageUrl,
  onLink,
  onUnlink,
}: {
  connected: boolean;
  disabled?: boolean;
  hasPassword: boolean;
  isLinking?: boolean;
  isUnlinking?: boolean;
  manageUrl: string;
  onLink: () => void;
  onUnlink: () => void;
}) => {
  if (connected) {
    return (
      <Card>
        <div className="flex min-w-0 items-center gap-3">
          <GoogleGlyph />
          <div className="min-w-0">
            <h2 className="text-base font-black text-foreground">Google conectado</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Sua conta também pode entrar pela autenticação do Google.
            </p>
          </div>
        </div>
        {!hasPassword ? (
          <InlineAlert title="Desconexão bloqueada" variant="info">
            Crie uma senha antes de desconectar o Google para não perder o acesso.
          </InlineAlert>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild className="rounded-full" variant="outline">
            <a href={manageUrl} rel="noreferrer" target="_blank">
              Gerenciar Conta Google
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
          <Button
            className="rounded-full"
            disabled={!hasPassword || isUnlinking}
            onClick={onUnlink}
            type="button"
            variant="outline"
          >
            {isUnlinking ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Unlink2 className="h-4 w-4" aria-hidden="true" />
            )}
            Desconectar Google
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex min-w-0 items-center gap-3">
        <GoogleGlyph />
        <div className="min-w-0">
          <h2 className="text-base font-black text-foreground">Entrar também com Google</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Para conectar, use no Google o mesmo e-mail cadastrado na Lectum.
          </p>
        </div>
      </div>
      {disabled ? (
        <InlineAlert title="Google indisponível" variant="info">
          Vínculo com Google bloqueado neste ambiente porque o OAuth não está configurado.
        </InlineAlert>
      ) : null}
      <Button
        className="rounded-full"
        disabled={disabled || isLinking}
        onClick={onLink}
        type="button"
      >
        {isLinking ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Link2 className="h-4 w-4" aria-hidden="true" />
        )}
        Conectar com Google
      </Button>
    </Card>
  );
};

const GoogleOnlyView = ({ email, manageUrl }: { email?: string | null; manageUrl: string }) => (
  <div className="grid gap-4 px-4 py-6">
    <Card className="justify-items-center px-8 py-9 text-center">
      <GoogleGlyph />
      <div>
        <h2 className="text-xl font-black leading-7 text-foreground">
          Você está conectado com o Google
        </h2>
        {email ? <p className="mt-2 text-base text-muted">{email}</p> : null}
      </div>
      <p className="max-w-[260px] text-sm leading-7 text-muted">
        Sua conta está vinculada ao Google. Para gerenciar seu e-mail ou senha, acesse as
        configurações da sua Conta do Google.
      </p>
    </Card>

    <Button asChild className="h-14 rounded-full" variant="outline">
      <a href={manageUrl} rel="noreferrer" target="_blank">
        Gerenciar Conta Google
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
    </Button>
  </div>
);

export const AccountSettingsLogic = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const storedUser = useAppSelector((state) => state.user);
  const googleConnectedFromRedirect = searchParams.get("google") === "connected";
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(() =>
    googleConnectedFromRedirect ? "Conta conectada ao Google com sucesso." : null,
  );
  const account = useAccount();
  const security = account.security.data;
  const currentEmail = security?.email || storedUser?.email || "";
  const form = useAccountForm(currentEmail);
  const isSaving = account.updateEmail.isPending || account.updatePassword.isPending;
  const isGoogleOnly = Boolean(security?.google.connected && !security.has_password);

  useEffect(() => {
    if (googleConnectedFromRedirect) {
      router.replace("/app/configuracoes/conta");
    }
  }, [googleConnectedFromRedirect, router]);

  const resetForm = (email = currentEmail) => {
    form.hook.reset({
      current_email: email,
      current_password: "",
      email: "",
      password: "",
      password_confirm: "",
    });
  };

  const onSubmit = form.hook.handleSubmit(async (values) => {
    setApiError(null);
    setSuccessMessage(null);

    const nextEmail = normalizeEmail(values.email);
    const wantsEmail = Boolean(nextEmail && nextEmail !== normalizeEmail(currentEmail));
    const wantsPassword = values.password.length > 0;

    if (values.email.trim() && !wantsEmail) {
      setApiError("O novo e-mail precisa ser diferente do e-mail atual.");
      return;
    }

    if (!wantsEmail && !wantsPassword) {
      setApiError("Informe um novo e-mail ou uma nova senha para salvar.");
      return;
    }

    try {
      let latestUser = storedUser;

      if (wantsEmail) {
        const updatedUser = await account.updateEmail.mutateAsync({
          current_password: values.current_password,
          email: nextEmail,
        });
        latestUser = updatedUser;
        dispatch(userActions.create(updatedUser));
      }

      if (wantsPassword) {
        const updatedUser = await account.updatePassword.mutateAsync({
          current_password: values.current_password,
          password: values.password,
          password_confirm: values.password_confirm,
        });
        latestUser = updatedUser;
        dispatch(userActions.create(updatedUser));
      }

      resetForm(latestUser?.email || nextEmail || currentEmail);
      setSuccessMessage(
        wantsEmail
          ? "Alterações salvas. Confirme o novo e-mail com o código enviado."
          : "Senha atualizada com sucesso.",
      );

      if (wantsEmail) {
        router.push("/auth/verify-email");
      }
    } catch (error) {
      setApiError(resolveAccountError(error, "Não foi possível salvar as alterações agora."));
    }
  });

  const handleGoogleLink = () => {
    setApiError(null);
    setSuccessMessage(null);
    account.createGoogleLinkIntent.mutate(undefined, {
      onSuccess: (data) => {
        const url = normalizeTrustedApiUrl(data.url);
        if (!url) {
          setApiError("Não foi possível iniciar o vínculo com Google.");
          return;
        }

        window.location.assign(url);
      },
      onError: (error) => {
        setApiError(resolveAccountError(error, "Não foi possível iniciar o vínculo com Google."));
      },
    });
  };

  const handleGoogleUnlink = () => {
    setApiError(null);
    setSuccessMessage(null);
    account.unlinkGoogle.mutate(undefined, {
      onSuccess: (data) => {
        dispatch(userActions.create(data));
        setSuccessMessage("Google desconectado da sua conta.");
      },
      onError: (error) => {
        setApiError(resolveAccountError(error, "Não foi possível desconectar o Google agora."));
      },
    });
  };

  const securityError = useMemo(
    () =>
      account.security.isError
        ? resolveAccountError(account.security.error, "Não foi possível carregar a conta.")
        : null,
    [account.security.error, account.security.isError],
  );

  return (
    <PrivateTemplate
      contentClassName="bg-background px-0 py-0"
      desktopSidebarDefaultCollapsed
      showMobileNavigation={false}
    >
      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-background px-5 py-5 sm:max-w-xl md:py-8">
        <AppPageHeader
          backHref="/app/perfil"
          backLabel="Voltar para meu perfil"
          className="mb-4"
          title="Email e senha"
        />

        {account.security.isLoading || account.security.isPending ? (
          <div className="grid min-h-[55vh] place-items-center">
            <LoadingState label="Carregando configurações de conta" />
          </div>
        ) : null}

        {securityError ? (
          <div className="py-6">
            <InlineAlert title="Conta indisponível" variant="error">
              {securityError}
            </InlineAlert>
          </div>
        ) : null}

        {!account.security.isLoading && !securityError && !security ? (
          <div className="py-6">
            <EmptyState
              description="Não encontramos os dados da conta para edição neste momento."
              icon={ShieldCheck}
              title="Nenhum dado de conta encontrado"
            />
          </div>
        ) : null}

        {security && isGoogleOnly ? (
          <GoogleOnlyView email={security.email} manageUrl={security.google.manage_url} />
        ) : null}

        {security && !isGoogleOnly ? (
          <div className="grid gap-7 py-2">
            {successMessage ? (
              <InlineAlert title="Alteração salva" variant="success">
                {successMessage}
              </InlineAlert>
            ) : null}
            {apiError ? (
              <InlineAlert title="Não foi possível concluir" variant="error">
                {apiError}
              </InlineAlert>
            ) : null}

            <form className="grid gap-7" noValidate onSubmit={onSubmit}>
              <div className="grid gap-3">
                <SectionTitle icon={AtSign} title="Alterar e-mail" />
                <Card>
                  <FieldList fields={emailFields} form={form} />
                </Card>
              </div>

              <div className="grid gap-3">
                <SectionTitle icon={KeyRound} title="Alterar senha" />
                <Card>
                  <FieldList fields={passwordFields} form={form} />
                </Card>
              </div>

              <Button className="h-14 rounded-full text-base" disabled={isSaving} type="submit">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                Salvar Alterações
              </Button>

              <p className="-mt-3 px-4 text-center text-xs leading-5 text-muted">
                Para sua segurança, após a alteração você poderá ser desconectado de outros
                dispositivos.
              </p>
            </form>

            <GoogleConnectionPanel
              connected={security.google.connected}
              disabled={!security.google.available}
              hasPassword={security.has_password}
              isLinking={account.createGoogleLinkIntent.isPending}
              isUnlinking={account.unlinkGoogle.isPending}
              manageUrl={security.google.manage_url}
              onLink={handleGoogleLink}
              onUnlink={handleGoogleUnlink}
            />
          </div>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};

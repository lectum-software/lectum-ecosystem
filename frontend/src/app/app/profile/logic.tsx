"use client";

import {
  BadgeCheck,
  BarChart3,
  Bookmark,
  ChevronRight,
  Edit3,
  HeartHandshake,
  Loader2,
  Lock,
  LogOut,
  MessagesSquare,
  Moon,
  ShieldAlert,
  Star,
  Trash2,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ComponentType, useState } from "react";
import { useAccount } from "@/api/callers/account";
import { components } from "@/components/controllers";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { useSignOut } from "@/hooks/cookies/signout";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { formatCrpLabel } from "@/utils/crp";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { useDeleteAccountForm } from "./use-delete-account-form";

type ProfileRow = {
  href?: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
};

const getPsychologistGenderTitle = (gender?: string | null) => {
  const normalized = gender?.toLowerCase();

  return normalized === "feminino" ? "Psicóloga" : "Psicólogo";
};

type PsychologistProfileWithGender = {
  gender?: string | null;
};

const getPsychologistGender = (user: {
  psychologist_profile?: { [key: string]: unknown } | null;
  patient_profile?: { gender?: string | null } | null;
}) => {
  const psychologistProfile = user.psychologist_profile as PsychologistProfileWithGender | null;

  return psychologistProfile?.gender || user.patient_profile?.gender || null;
};

const getInitials = (name?: string | null, email?: string | null) => {
  const source = name?.trim() || email?.split("@")[0] || "Lectum";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const Row = ({ href, icon: Icon, label }: ProfileRow) => {
  const content = (
    <>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex-1 text-sm font-semibold text-foreground">{label}</span>
      <ChevronRight className="h-5 w-5 text-subtle" aria-hidden="true" />
    </>
  );

  if (href) {
    return (
      <Link
        className="flex min-h-14 items-center gap-3 border-b border-border px-4 transition last:border-b-0 hover:bg-primary-soft/60"
        href={href}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      aria-disabled="true"
      className="flex min-h-14 items-center gap-3 border-b border-border px-4 opacity-75 last:border-b-0"
    >
      {content}
    </div>
  );
};

const Section = ({ rows, title }: { rows: ProfileRow[]; title: string }) => {
  return (
    <section className="overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
      <h2 className="border-b border-border bg-surface-muted px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted">
        {title}
      </h2>
      <div>
        {rows.map((row) => (
          <Row key={row.label} {...row} />
        ))}
      </div>
    </section>
  );
};

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const resolveDeleteAccountError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("assinatura") || normalized.includes("pagamento")) {
    return "Cancele ou regularize a assinatura paga antes de excluir a conta.";
  }

  if (normalized.includes("senha atual") || normalized.includes("incorreta")) {
    return "A senha atual não confere. Revise e tente novamente.";
  }

  if (normalized.includes("excluir")) {
    return "Digite EXCLUIR para confirmar a exclusão.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para excluir a conta.";
  }

  return rawMessage || "Não foi possível excluir sua conta agora.";
};

export const ProfileLogic = () => {
  const user = useAppSelector((state) => state.user);
  const { out } = useSignOut();
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const isPsychologist = user?.role === "psicologo";
  const account = useAccount({ enableSecurity: Boolean(isPsychologist && showDeleteAccount) });
  const deleteAccountHasPassword = account.security.data?.has_password ?? true;
  const deleteAccountForm = useDeleteAccountForm(deleteAccountHasPassword);

  if (!user) {
    return (
      <PrivateTemplate>
        <section className="grid min-h-[55vh] place-items-center">
          <LoadingState label="Carregando seu perfil" />
        </section>
      </PrivateTemplate>
    );
  }

  const displayName = user.name?.trim() || user.email || "Usuário Lectum";
  const formattedCrp = user.psychologist_profile?.crp
    ? formatCrpLabel(user.psychologist_profile.crp)
    : null;
  const profileGender = getPsychologistGender(user);
  const hasVerifiedBadge = Boolean(
    user.psychologist_profile?.subscriptions?.some(
      (subscription) => subscription.status === "ativa" && subscription.plan?.slug !== "gratuito",
    ),
  );
  const subtitle = isPsychologist
    ? `${getPsychologistGenderTitle(profileGender)}${formattedCrp ? ` • ${formattedCrp}` : ""}`
    : null;
  const avatarSrc = resolvePublicMediaUrl(user.avatar);
  const avatarIsPublicMedia = isPublicMediaUrl(user.avatar);

  const accountRows: ProfileRow[] = [
    {
      href: isPsychologist ? "/app/professional/profile/setup" : "/app/profile/edit",
      icon: Edit3,
      label: "Editar perfil",
    },
    ...(isPsychologist
      ? [
          { href: "/app/professional/analytics", icon: BarChart3, label: "Meus Analytics" },
          { href: "/app/professional/reviews", icon: Star, label: "Minhas Avaliações" },
          {
            href: "/app/professional/billing/subscription",
            icon: BadgeCheck,
            label: "Minha Assinatura",
          },
        ]
      : [{ href: "/app/reviews", icon: Star, label: "Avaliações" }]),
    { href: "/app/settings/account", icon: Lock, label: "E-mail e senha" },
  ];

  const communityRows: ProfileRow[] = [
    { href: "/app/posts/mine", icon: MessagesSquare, label: "Meus posts e respostas" },
    { href: "/app/following", icon: UsersRound, label: "Comunidades seguidas" },
    { href: "/app/posts/saved", icon: Bookmark, label: "Salvos" },
    { href: "/app/community", icon: HeartHandshake, label: "Explorar comunidades" },
  ];

  const onDeleteAccountSubmit = deleteAccountForm.hook.handleSubmit((values) => {
    setDeleteAccountError(null);
    account.deleteAccount.mutate(
      {
        confirmation: values.confirmation.trim(),
        ...(deleteAccountHasPassword
          ? { current_password: values.current_password?.trim() || "" }
          : {}),
      },
      {
        onError: (error) => setDeleteAccountError(resolveDeleteAccountError(error)),
        onSuccess: () => out("/auth/login"),
      },
    );
  });

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-3xl">
        <div className="overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
          <div className="grid justify-items-center bg-white px-6 py-8 text-center dark:bg-surface">
            <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border-4 border-white bg-primary text-3xl font-bold text-white shadow-[var(--lectum-shadow-soft)]">
              {avatarSrc ? (
                <Image
                  alt={displayName}
                  className="h-full w-full object-cover"
                  height={112}
                  src={avatarSrc}
                  unoptimized={avatarIsPublicMedia}
                  width={112}
                />
              ) : (
                getInitials(user.name, user.email)
              )}
            </div>

            <h1 className="mt-5 text-2xl font-bold leading-7 text-foreground">
              <span className="line-clamp-2 block min-w-0 break-words">
                <span>{displayName}</span>
                {isPsychologist && hasVerifiedBadge ? (
                  <VerifiedBadgeIcon aria-hidden="true" className="ml-1 inline h-5 w-5" />
                ) : null}
              </span>
            </h1>
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
            {user.email ? <p className="mt-2 text-xs text-subtle">{user.email}</p> : null}
            {isPsychologist ? (
              <Button asChild className="mt-3 h-10 rounded-full" variant="outline">
                <Link href={`/app/psychologist/${user.id}`}>Ver perfil público</Link>
              </Button>
            ) : null}
          </div>
        </div>

        <Section rows={accountRows} title="Conta" />

        <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-4 py-3 shadow-[var(--lectum-shadow-soft)]">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
              <Moon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Ativar modo escuro</p>
            </div>
            <ThemeSwitch />
          </div>
        </section>

        <Section rows={communityRows} title="Comunidade" />

        {isPsychologist ? (
          <section className="grid gap-4 rounded-[var(--lectum-card-radius)] border border-danger/25 bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
                <ShieldAlert className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-foreground">Excluir conta</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Seu perfil público será ocultado e seus acessos serão encerrados. Contas com
                  assinatura paga vinculada ao gateway ou pagamento em aberto precisam cancelar ou
                  regularizar a cobrança antes da exclusão.
                </p>
              </div>
            </div>

            {!showDeleteAccount ? (
              <Button
                className="w-full border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
                onClick={() => {
                  setShowDeleteAccount(true);
                  setDeleteAccountError(null);
                }}
                type="button"
                variant="outline"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Excluir minha conta
              </Button>
            ) : (
              <form className="grid gap-3" noValidate onSubmit={onDeleteAccountSubmit}>
                {account.security.isLoading || account.security.isPending ? (
                  <LoadingState label="Verificando segurança da conta" />
                ) : null}

                {account.security.isError ? (
                  <InlineAlert title="Não foi possível verificar a conta" variant="error">
                    {resolveDeleteAccountError(account.security.error)}
                  </InlineAlert>
                ) : null}

                <InlineAlert title="Atenção antes de continuar" variant="warning">
                  Esta ação não cancela cobranças externas automaticamente. Se houver assinatura
                  paga ou inadimplência, a exclusão será bloqueada até a regularização.
                </InlineAlert>

                <div className="grid gap-1">
                  {deleteAccountForm.formProps.fields.map((field) => {
                    if (field.hide) return null;

                    const Component = components[field.field];
                    if (!Component) return null;

                    return (
                      <Component
                        control={deleteAccountForm.hook.control}
                        key={`delete-account-${String(field.name)}`}
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
                    onClick={() => {
                      setShowDeleteAccount(false);
                      setDeleteAccountError(null);
                      deleteAccountForm.hook.reset();
                    }}
                    type="button"
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="bg-danger text-white hover:bg-danger/90"
                    disabled={account.deleteAccount.isPending || account.security.isLoading}
                    type="submit"
                  >
                    {account.deleteAccount.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    )}
                    Confirmar exclusão
                  </Button>
                </div>
              </form>
            )}
          </section>
        ) : null}

        <Button
          className="w-full"
          onClick={() => out("/auth/login")}
          type="button"
          variant="outline"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair da conta
        </Button>
      </section>
    </PrivateTemplate>
  );
};

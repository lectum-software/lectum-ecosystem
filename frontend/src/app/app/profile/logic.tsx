"use client";

import {
  BadgeCheck,
  BarChart3,
  Bookmark,
  ChevronRight,
  Edit3,
  HeartHandshake,
  Lock,
  LogOut,
  MessagesSquare,
  Moon,
  Star,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { useSignOut } from "@/hooks/cookies/signout";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { formatCrpNumber } from "@/utils/crp";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

type ProfileRow = {
  href?: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
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

export const ProfileLogic = () => {
  const user = useAppSelector((state) => state.user);
  const { out } = useSignOut();

  if (!user) {
    return (
      <PrivateTemplate>
        <section className="grid min-h-[55vh] place-items-center">
          <LoadingState label="Carregando seu perfil" />
        </section>
      </PrivateTemplate>
    );
  }

  const isPsychologist = user.role === "psicologo";
  const displayName = user.name?.trim() || user.email || "Usuário Lectum";
  const formattedCrp = formatCrpNumber(user.psychologist_profile?.crp);
  const hasVerifiedBadge = Boolean(
    user.psychologist_profile?.subscriptions?.some(
      (subscription) => subscription.status === "ativa" && subscription.plan?.slug !== "gratuito",
    ),
  );
  const subtitle = isPsychologist
    ? `Psicólogo${formattedCrp ? ` • CRP ${formattedCrp}` : ""}`
    : "Paciente";
  const avatarSrc = resolvePublicMediaUrl(user.avatar);
  const avatarIsPublicMedia = isPublicMediaUrl(user.avatar);

  const accountRows: ProfileRow[] = [
    {
      href: isPsychologist ? "/app/professional/profile/setup" : undefined,
      icon: Edit3,
      label: "Editar perfil",
    },
    ...(isPsychologist
      ? [
          { icon: BarChart3, label: "Meus Analytics" },
          { icon: Star, label: "Minhas Avaliações" },
          {
            href: "/app/professional/billing/plans",
            icon: BadgeCheck,
            label: "Minha Assinatura",
          },
        ]
      : [{ href: "/app/reviews", icon: Star, label: "Avaliações" }]),
    { icon: Lock, label: "E-mail e senha" },
  ];

  const communityRows: ProfileRow[] = [
    { icon: MessagesSquare, label: "Meus posts e respostas" },
    { icon: UsersRound, label: "Seguindo" },
    { icon: Bookmark, label: "Salvos" },
    { icon: HeartHandshake, label: "Explorar comunidades" },
  ];

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-3xl">
        <div className="overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
          <div className="grid justify-items-center bg-primary-soft/50 px-6 py-8 text-center">
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

            <h1 className="mt-5 flex items-center gap-2 text-2xl font-bold text-foreground">
              {displayName}
              {isPsychologist && hasVerifiedBadge ? (
                <VerifiedBadgeIcon aria-hidden="true" className="h-5 w-5" />
              ) : null}
            </h1>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
            {user.email ? <p className="mt-2 text-xs text-subtle">{user.email}</p> : null}
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
              <p className="text-xs text-muted">O tema claro permanece como padrão da conta.</p>
            </div>
            <ThemeSwitch />
          </div>
        </section>

        <Section rows={communityRows} title="Comunidade" />

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

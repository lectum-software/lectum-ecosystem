"use client";

import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bookmark,
  ChevronRight,
  Compass,
  Edit3,
  Lock,
  LogOut,
  MessagesSquare,
  Moon,
  Smartphone,
  Star,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { usePsychologistFreeProfile } from "@/api/callers/psychologist-free-profile";
import { LoadingState } from "@/components/ui/loading-state";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { useSignOut } from "@/hooks/cookies/signout";
import { usePwaInstallAccountAction } from "@/hooks/pwa-install";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { formatCrpLabel } from "@/utils/crp";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import {
  getActiveProfessionalSubscription,
  isPaidRegistryVerificationComplete,
  PSYCHOLOGIST_ONBOARDING_PATHS,
} from "@/utils/psychologist-onboarding";

type ProfileRow = {
  ariaLabel?: string;
  disabled?: boolean;
  href?: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  hideChevron?: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
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

const rowClassName = "flex min-h-14 items-center gap-3 border-b border-border px-4 last:border-b-0";
const interactiveRowClassName = `${rowClassName} transition hover:bg-primary-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25`;

const Row = ({
  ariaLabel,
  disabled = false,
  href,
  hideChevron = false,
  icon: Icon,
  label,
  onClick,
  trailing,
}: ProfileRow) => {
  const content = (
    <>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex-1 text-sm font-semibold text-foreground">{label}</span>
      {trailing}
      {hideChevron ? null : <ChevronRight className="h-5 w-5 text-subtle" aria-hidden="true" />}
    </>
  );

  if (href) {
    return (
      <Link className={interactiveRowClassName} href={href}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        aria-label={ariaLabel ?? label}
        className={`${interactiveRowClassName} w-full text-left disabled:cursor-wait disabled:opacity-70`}
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <div className={rowClassName}>{content}</div>;
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

const ProfessionalUpgradeCard = () => (
  <Link
    className="group relative isolate overflow-hidden rounded-[var(--lectum-card-radius)] border border-primary/15 bg-primary-soft/85 p-4 text-primary shadow-[var(--lectum-shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
    href={PSYCHOLOGIST_ONBOARDING_PATHS.checkout}
  >
    <span
      aria-hidden="true"
      className="-top-10 -right-8 absolute h-24 w-24 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/15"
    />
    <span
      aria-hidden="true"
      className="-bottom-12 -left-10 absolute h-28 w-28 rounded-full bg-surface/70 blur-2xl dark:bg-media-foreground/5"
    />
    <span className="relative flex min-w-0 items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface/95 text-primary shadow-sm ring-1 ring-primary/10">
        <BadgeCheck className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold leading-5 tracking-[-0.01em] text-foreground">
          Upgrade para o Plano Profissional
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted">
          Receba avaliações, aumente sua visibilidade nas buscas e desbloqueie recursos exclusivos
          para fortalecer sua presença na Lectum.
        </span>
      </span>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface/90 text-primary shadow-sm transition group-hover:translate-x-0.5 group-hover:bg-surface dark:bg-surface">
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </span>
  </Link>
);

export const ProfileLogic = () => {
  const user = useAppSelector((state) => state.user);
  const { out } = useSignOut();
  const pwaInstall = usePwaInstallAccountAction();
  const isPsychologist = user?.role === "psicologo";
  const psychologistProfile = usePsychologistFreeProfile({ enabled: Boolean(isPsychologist) });
  const showProfileActivationAlert = Boolean(
    isPsychologist &&
      psychologistProfile.profile.data?.activation &&
      !psychologistProfile.profile.data.activation.active,
  );

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
  const activeProfessionalSubscription = getActiveProfessionalSubscription(
    user.psychologist_profile,
  );
  const hasVerifiedBadge = Boolean(
    activeProfessionalSubscription &&
      isPaidRegistryVerificationComplete(user.psychologist_profile, activeProfessionalSubscription),
  );
  const showProfessionalUpgradeCard = Boolean(
    isPsychologist && (psychologistProfile.profile.data?.plan.is_free ?? !hasVerifiedBadge),
  );
  const subtitle = isPsychologist
    ? `${getPsychologistGenderTitle(profileGender)}${formattedCrp ? ` • ${formattedCrp}` : ""}`
    : null;
  const avatarSrc = resolvePublicMediaUrl(user.avatar);
  const avatarIsPublicMedia = isPublicMediaUrl(user.avatar);

  const accountRows: ProfileRow[] = [
    ...(pwaInstall.isVisible
      ? [
          {
            ariaLabel: "Instalar aplicativo Lectum",
            disabled: pwaInstall.isInstalling,
            hideChevron: true,
            icon: Smartphone,
            label: "Instalar aplicativo",
            onClick: pwaInstall.onInstall,
            trailing: (
              <span className="shrink-0 text-sm font-extrabold text-primary">
                {pwaInstall.isInstalling ? "Abrindo..." : "Instalar"}
              </span>
            ),
          },
        ]
      : []),
    {
      href: isPsychologist ? "/app/profissional/perfil/configurar" : "/app/perfil/editar",
      icon: Edit3,
      label: "Editar perfil",
      trailing: showProfileActivationAlert ? (
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-danger/10 text-danger"
          title="Perfil não ativo"
        >
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Perfil não ativo</span>
        </span>
      ) : null,
    },
    ...(isPsychologist
      ? [
          { href: "/app/profissional/estatisticas", icon: BarChart3, label: "Meus Analytics" },
          { href: "/app/profissional/avaliacoes", icon: Star, label: "Minhas Avaliações" },
          {
            href: "/app/profissional/assinatura",
            icon: BadgeCheck,
            label: "Minha Assinatura",
          },
        ]
      : [{ href: "/app/avaliacoes", icon: Star, label: "Avaliações" }]),
    { href: "/app/configuracoes/conta", icon: Lock, label: "E-mail e senha" },
    {
      hideChevron: true,
      icon: Moon,
      label: "Ativar modo escuro",
      trailing: <ThemeSwitch />,
    },
  ];

  const communityRows: ProfileRow[] = [
    {
      href: "/app/publicacoes/minhas",
      icon: MessagesSquare,
      label: isPsychologist ? "Meus posts e respostas" : "Meus posts e comentários",
    },
    { href: "/app/publicacoes/salvas", icon: Bookmark, label: "Salvos" },
    { href: "/app/comunidades-seguidas", icon: UsersRound, label: "Comunidades seguidas" },
    { href: "/comunidades", icon: Compass, label: "Explorar comunidades" },
  ];

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-3xl">
        <div className="overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
          <div className="grid justify-items-center bg-surface px-6 py-8 text-center dark:bg-surface">
            <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border-4 border-media-foreground bg-primary text-3xl font-bold text-primary-foreground shadow-[var(--lectum-shadow-soft)]">
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
                <Link href={`/psicologos/${user.id}`}>Ver perfil público</Link>
              </Button>
            ) : null}
          </div>
        </div>

        {showProfessionalUpgradeCard ? <ProfessionalUpgradeCard /> : null}

        <Section rows={communityRows} title="Comunidade" />

        <Section rows={accountRows} title="Conta" />

        <Button
          className="w-full"
          onClick={() => out("/auth/login")}
          type="button"
          variant="outline"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair da conta
        </Button>

        {pwaInstall.dialog}
      </section>
    </PrivateTemplate>
  );
};

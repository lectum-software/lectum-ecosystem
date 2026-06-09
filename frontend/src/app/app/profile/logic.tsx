"use client";

import {
  BadgeCheck,
  BarChart3,
  Bookmark,
  CalendarDays,
  ChevronRight,
  Edit3,
  HeartHandshake,
  Lock,
  LogOut,
  MessagesSquare,
  Moon,
  Phone,
  Sparkles,
  Star,
  UserRound,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType } from "react";
import { usePatient } from "@/api/callers/patient";
import { formatPhone } from "@/components/controllers/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
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

type DetailItem = {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value?: string | null;
};

const goalLabels: Record<string, string> = {
  encontrar_psicologo: "Encontrar psicólogo",
  conhecer_comunidade: "Conhecer comunidades",
};

const genderLabels: Record<string, string> = {
  feminino: "Feminino",
  masculino: "Masculino",
  nao_binario: "Não binário",
  prefiro_nao_dizer: "Prefiro não dizer",
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

const formatBirthdate = (value?: string | null) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
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

const DetailCard = ({ items }: { items: DetailItem[] }) => {
  const hasAnyValue = items.some((item) => item.value);

  return (
    <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-subtle">
            Dados pessoais
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-foreground">Seu perfil de paciente</h2>
        </div>
        <Button asChild className="h-10 rounded-full px-4" variant="outline">
          <Link href="/app/profile/edit">
            <Edit3 className="h-4 w-4" aria-hidden="true" />
            Editar
          </Link>
        </Button>
      </div>

      {hasAnyValue ? (
        <div className="grid gap-3">
          {items.map(({ icon: Icon, label, value }) => (
            <div className="flex items-start gap-3 rounded-2xl bg-surface-muted p-3" key={label}>
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                <Icon className="h-4 w-4" aria-hidden={true} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-subtle">{label}</p>
                <p className="mt-1 text-sm leading-6 text-foreground">
                  {value || "Ainda não informado"}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          action={
            <Button asChild className="rounded-full">
              <Link href="/app/profile/edit">Completar perfil</Link>
            </Button>
          }
          description="Adicione telefone, objetivo e uma breve descrição para manter seus dados pessoais organizados."
          icon={UserRound}
          title="Nenhum dado adicional informado"
        />
      )}
    </section>
  );
};

export const ProfileLogic = () => {
  const user = useAppSelector((state) => state.user);
  const { out } = useSignOut();
  const isPatient = user?.role === "paciente";
  const { profile } = usePatient({ enableProfile: isPatient });

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
  const profileGender = getPsychologistGender(user);
  const hasVerifiedBadge = Boolean(
    user.psychologist_profile?.subscriptions?.some(
      (subscription) => subscription.status === "ativa" && subscription.plan?.slug !== "gratuito",
    ),
  );
  const subtitle = isPsychologist
    ? `${getPsychologistGenderTitle(profileGender)}${formattedCrp ? ` • CRP ${formattedCrp}` : ""}`
    : "Paciente";
  const avatarSrc = resolvePublicMediaUrl(user.avatar);
  const avatarIsPublicMedia = isPublicMediaUrl(user.avatar);
  const patientProfile = profile.data ?? user.patient_profile ?? null;
  const detailItems: DetailItem[] = [
    {
      icon: Sparkles,
      label: "Preferência",
      value: patientProfile?.goal ? goalLabels[patientProfile.goal] : null,
    },
    {
      icon: UserRound,
      label: "Gênero",
      value: patientProfile?.gender ? genderLabels[patientProfile.gender] : null,
    },
    {
      icon: CalendarDays,
      label: "Nascimento",
      value: formatBirthdate(patientProfile?.birthdate),
    },
    {
      icon: Phone,
      label: "Telefone",
      value: patientProfile?.phone ? formatPhone(patientProfile.phone) : null,
    },
    {
      icon: MessagesSquare,
      label: "Sobre você",
      value: patientProfile?.bio,
    },
  ];

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
    { icon: Lock, label: "E-mail e senha" },
  ];

  const communityRows: ProfileRow[] = [
    { icon: MessagesSquare, label: "Meus posts e respostas" },
    { icon: UsersRound, label: "Comunidades seguidas" },
    { icon: Bookmark, label: "Salvos" },
    { href: "/app/community", icon: HeartHandshake, label: "Explorar comunidades" },
  ];

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-3xl">
        <div className="overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
          <div className="grid justify-items-center bg-white px-6 py-8 text-center">
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

            <h1 className="mt-5 text-2xl font-bold text-foreground">
              <span className="inline-flex min-w-0 items-end">
                <span className="min-w-0 break-words">{displayName}</span>
                {isPsychologist && hasVerifiedBadge ? (
                  <VerifiedBadgeIcon aria-hidden="true" className="ml-0.5 h-5 w-5 shrink-0" />
                ) : null}
              </span>
            </h1>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
            {user.email ? <p className="mt-2 text-xs text-subtle">{user.email}</p> : null}
            {isPsychologist ? (
              <Button asChild className="mt-3 h-10 rounded-full" variant="outline">
                <Link href={`/app/psychologist/${user.id}`}>Ver perfil público</Link>
              </Button>
            ) : null}
          </div>
        </div>

        {isPatient && profile.isLoading ? (
          <LoadingState label="Atualizando dados do paciente" />
        ) : null}
        {isPatient && profile.isError ? (
          <InlineAlert title="Não foi possível carregar dados pessoais" variant="error">
            Confira sua conexão e tente novamente. Seus dados de conta continuam disponíveis.
          </InlineAlert>
        ) : null}
        {isPatient ? <DetailCard items={detailItems} /> : null}

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

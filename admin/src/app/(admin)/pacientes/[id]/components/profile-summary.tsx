"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BarChart3,
  Flame,
  Loader2,
  LockKeyhole,
  type LucideIcon,
  Pencil,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAdminPatientUpdatePersonalData } from "@/api/callers/patients";
import { resolveApiError } from "@/api/handle";
import type { AdminPatientDetail, PatientsDetailMetric } from "@/api/req/patients";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import {
  numberFormatter,
  PATIENT_GENDER_OPTIONS,
  PATIENT_GENERAL_METRIC_IDS,
  type PatientPersonalDataFormValues,
  patientIntentDisplayLabels,
  patientPersonalDataSchema,
} from "../modules/detail-config";

import {
  emptyToNull,
  formatDateTime,
  formatLastAccess,
  formatPatientGender,
  mergeCurrentOption,
  patientTabHref,
} from "../modules/detail-support";
import { ActivityList } from "./activities";
import { CardShell, IconCircle, MetricCard } from "./common";
import { formatPatientIntentScore } from "./intent-activity";

export const FieldRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="grid gap-1 border-b border-border/80 py-3 last:border-0 sm:grid-cols-[190px_1fr]">
    <dt className="text-sm font-extrabold text-muted">{label}</dt>
    <dd className="text-sm font-bold text-foreground">{value}</dd>
  </div>
);

export const InfoCard = ({
  action,
  children,
  contentAsDescriptionList = true,
  description,
  icon: Icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  contentAsDescriptionList?: boolean;
  description?: string;
  icon: LucideIcon;
  title: string;
}) => (
  <CardShell className="p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <IconCircle icon={Icon} />
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="w-full sm:w-auto">{action}</div> : null}
    </div>
    {contentAsDescriptionList ? (
      <dl className="mt-4">{children}</dl>
    ) : (
      <div className="mt-4">{children}</div>
    )}
  </CardShell>
);

export const formatPatientLocation = (detail: AdminPatientDetail) => {
  const location = detail.header.location;
  if (!location) return "Não informado";

  return (
    [location.city, location.state, location.country].filter(Boolean).join(", ") || "Não informado"
  );
};

export const SummaryCard = ({
  actionHref,
  actionLabel,
  eyebrow,
  children,
  helperText,
  icon: Icon,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  children: ReactNode;
  eyebrow: string;
  helperText: string;
  icon: LucideIcon;
  title: string;
}) => (
  <CardShell className="flex h-full flex-col p-5">
    <div className="rounded-[28px] border border-primary/15 bg-primary-soft/55 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">{eyebrow}</p>
          <p className="mt-1 text-xl font-black text-foreground">{title}</p>
        </div>
        <IconCircle icon={Icon} />
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-muted">{helperText}</p>
    </div>
    <dl className="mt-4 flex-1 divide-y divide-border text-sm">{children}</dl>
    {actionHref && actionLabel ? (
      <Link
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-control border border-primary/45 bg-surface px-4 text-sm font-black text-primary shadow-control transition hover:bg-primary-soft sm:w-auto"
        href={actionHref}
      >
        {actionLabel}
      </Link>
    ) : null}
  </CardShell>
);

export const AccountSituationCard = ({
  detail,
  id,
}: {
  detail: AdminPatientDetail;
  id: string;
}) => {
  const active = detail.header.status === "active";
  const helperText = active
    ? "Login liberado para uso normal da plataforma."
    : "Conta sem acesso ativo no momento; revise as ações completas na aba Conta.";

  return (
    <SummaryCard
      actionHref={patientTabHref(id, "conta")}
      actionLabel="Abrir dados da conta"
      eyebrow="Conta"
      helperText={helperText}
      icon={UserRound}
      title={active ? "Conta ativa" : "Conta inativa"}
    >
      <FieldRow label="E-mail" value={detail.header.email} />
      <FieldRow label="Último acesso" value={formatLastAccess(detail.header.last_access_at)} />
      <FieldRow label="Cadastro via" value={detail.header.provider_label} />
      <FieldRow label="Criado em" value={formatDateTime(detail.header.created_at)} />
    </SummaryCard>
  );
};

export const getPatientGeneralMetrics = (detail: AdminPatientDetail) =>
  detail.metrics.filter((metric) => PATIENT_GENERAL_METRIC_IDS.has(metric.id));

export const getPatientMetricValue = (detail: AdminPatientDetail, id: PatientsDetailMetric["id"]) =>
  detail.metrics.find((metric) => metric.id === id)?.value ?? 0;

export const diagnosePatientGeneralEngagement = (total: number) => {
  if (total < 3) return "Sem base";
  if (total >= 12) return "Muito ativo";
  if (total >= 6) return "Ativo";

  return "Pouco ativo";
};

export const getPatientLastActivityAt = (detail: AdminPatientDetail) =>
  detail.activities.items.reduce<string | null>((latest, activity) => {
    if (!latest) return activity.occurred_at;

    const latestDate = new Date(latest);
    const activityDate = new Date(activity.occurred_at);

    if (Number.isNaN(activityDate.getTime())) return latest;
    if (Number.isNaN(latestDate.getTime())) return activity.occurred_at;

    return activityDate > latestDate ? activity.occurred_at : latest;
  }, null);

export const PatientEngagementSummaryCard = ({
  detail,
  id,
}: {
  detail: AdminPatientDetail;
  id: string;
}) => {
  const activeCommunities = detail.communities.items.length;
  const posts = getPatientMetricValue(detail, "posts_created");
  const replies = getPatientMetricValue(detail, "comments_created");
  const totalSignals = activeCommunities + posts + replies;
  const engagementDiagnosis = diagnosePatientGeneralEngagement(totalSignals);
  const lastActivityAt = getPatientLastActivityAt(detail);

  return (
    <SummaryCard
      actionHref={patientTabHref(id, "estatisticas")}
      actionLabel="Abrir estatísticas"
      eyebrow="Engajamento"
      helperText="Diagnóstico derivado de comunidades ativas, posts e respostas no período padrão."
      icon={BarChart3}
      title={engagementDiagnosis}
    >
      <FieldRow label="Comunidades ativas" value={numberFormatter.format(activeCommunities)} />
      <FieldRow label="Posts" value={numberFormatter.format(posts)} />
      <FieldRow label="Respostas" value={numberFormatter.format(replies)} />
      <FieldRow
        label="Última atividade"
        value={lastActivityAt ? formatDateTime(lastActivityAt) : "Não capturada"}
      />
    </SummaryCard>
  );
};

export const PatientIntentSummaryCard = ({
  detail,
  id,
}: {
  detail: AdminPatientDetail;
  id: string;
}) => {
  const intent = detail.intent_analysis;
  const classification = patientIntentDisplayLabels[intent.level.id];

  return (
    <SummaryCard
      actionHref={patientTabHref(id, "estatisticas")}
      actionLabel="Abrir análise de intenção"
      eyebrow="Intenção"
      helperText={intent.summary}
      icon={Flame}
      title={classification}
    >
      <FieldRow label="Classificação" value={intent.level.label} />
      <FieldRow label="Score" value={formatPatientIntentScore(intent.score, intent.max_score)} />
      <FieldRow label="Sinais de atividade" value={numberFormatter.format(intent.total_signals)} />
      <FieldRow
        label="Último sinal"
        value={intent.last_signal_at ? formatDateTime(intent.last_signal_at) : "Não capturado"}
      />
    </SummaryCard>
  );
};

export const ProfileEditButton = ({
  disabled,
  onClick,
}: {
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-control border border-primary px-4 text-sm font-black text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:border-border disabled:text-muted sm:w-auto"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    <Pencil aria-hidden className="h-4 w-4" />
    Editar
  </button>
);

export const ProfileFormActions = ({
  disabled,
  onCancel,
}: {
  disabled?: boolean;
  onCancel: () => void;
}) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
    <button
      className="inline-flex h-11 items-center justify-center rounded-control border border-border px-4 text-sm font-black text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-muted"
      disabled={disabled}
      onClick={onCancel}
      type="button"
    >
      Cancelar
    </button>
    <button
      className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
      disabled={disabled}
      type="submit"
    >
      {disabled ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
      Salvar alterações
    </button>
  </div>
);

export const PatientPersonalDataRows = ({ detail }: { detail: AdminPatientDetail }) => (
  <>
    <FieldRow label="Nome de exibição" value={detail.header.name} />
    <FieldRow label="E-mail" value={detail.header.email} />
    <FieldRow label="Gênero" value={formatPatientGender(detail.header.gender)} />
    <FieldRow label="Localização" value={formatPatientLocation(detail)} />
  </>
);

export const PatientPersonalDataEditForm = ({
  detail,
  onCancel,
}: {
  detail: AdminPatientDetail;
  onCancel: () => void;
}) => {
  const mutation = useAdminPatientUpdatePersonalData(detail.header.id);
  const form = useForm<PatientPersonalDataFormValues>({
    defaultValues: {
      display_name: detail.header.name,
      gender: detail.header.gender || "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(patientPersonalDataSchema),
  });
  const disabled = mutation.isPending;
  const onSubmit: SubmitHandler<PatientPersonalDataFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        display_name: values.display_name.trim(),
        gender: emptyToNull(values.gender),
        reason: values.reason.trim(),
      });
      toast.success("Dados pessoais do paciente atualizados.");
      onCancel();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="rounded-2xl border border-border/80 bg-surface-muted p-4">
          <FieldRow
            label="E-mail"
            value={
              <span className="inline-flex items-center gap-2">
                {detail.header.email}
                <LockKeyhole
                  aria-label="E-mail editável somente por fluxo de conta"
                  className="h-4 w-4 text-muted"
                />
              </span>
            }
          />
          <FieldRow label="Localização" value={formatPatientLocation(detail)} />
        </div>
        <InputController<PatientPersonalDataFormValues>
          disabled={disabled}
          label="Nome de exibição"
          name="display_name"
          placeholder="Informe o nome exibido no perfil administrativo."
          required
        />
        <SelectController<PatientPersonalDataFormValues>
          disabled={disabled}
          label="Gênero"
          name="gender"
          options={mergeCurrentOption(PATIENT_GENDER_OPTIONS, detail.header.gender)}
        />
        <TextareaController<PatientPersonalDataFormValues>
          disabled={disabled}
          label="Motivo da alteração"
          name="reason"
          placeholder="Descreva o motivo operacional da alteração."
          required
          rows={3}
        />
        <p className="rounded-2xl bg-surface-muted p-3 text-xs font-bold leading-5 text-muted">
          Nome de exibição e gênero podem ser atualizados, e a alteração fica registrada no
          histórico administrativo. E-mail e localização permanecem somente leitura: o e-mail
          pertence ao fluxo de conta e a localização é informada pelo próprio paciente no perfil.
        </p>
        <ProfileFormActions disabled={disabled} onCancel={onCancel} />
      </form>
    </FormProvider>
  );
};

export const ProfileRegistrationTab = ({ detail }: { detail: AdminPatientDetail }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="grid gap-5">
      <InfoCard
        action={isEditing ? null : <ProfileEditButton onClick={() => setIsEditing(true)} />}
        contentAsDescriptionList={!isEditing}
        icon={UserRound}
        title="Dados pessoais"
      >
        {isEditing ? (
          <PatientPersonalDataEditForm detail={detail} onCancel={() => setIsEditing(false)} />
        ) : (
          <PatientPersonalDataRows detail={detail} />
        )}
      </InfoCard>
    </div>
  );
};

export const GeneralTab = ({ detail, id }: { detail: AdminPatientDetail; id: string }) => (
  <div className="space-y-5">
    <section>
      <h2 className="sr-only">Métricas principais do paciente</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {getPatientGeneralMetrics(detail).map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>

    <div className="grid items-stretch gap-5 xl:grid-cols-3">
      <AccountSituationCard detail={detail} id={id} />
      <PatientEngagementSummaryCard detail={detail} id={id} />
      <PatientIntentSummaryCard detail={detail} id={id} />
    </div>

    <ActivityList detail={detail} />
  </div>
);

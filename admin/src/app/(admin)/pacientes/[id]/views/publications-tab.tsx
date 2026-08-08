"use client";

import { BarChart3, ChevronDown, ChevronUp, Eye, FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type {
  AdminPatientDetail,
  PatientsDetailPublication,
  PatientsDetailPublicationMetric,
} from "@/api/req/patients";
import { toPublicFrontendHref } from "@/lib/public-frontend-url";
import { CardShell, IconCircle } from "../components/common";
import {
  numberFormatter,
  patientPublicationMetricIcon,
  patientPublicationMetricLabel,
  patientPublicationMetricOrder,
} from "../modules/detail-config";
import { formatDateTime } from "../modules/detail-support";

export const PatientPublicationMetricChip = ({
  metric,
}: {
  metric: PatientsDetailPublicationMetric;
}) => {
  const Icon = patientPublicationMetricIcon[metric.id];
  const label = patientPublicationMetricLabel[metric.id] ?? metric.label.toLowerCase();
  const value = metric.available ? numberFormatter.format(metric.value) : "indisponível";

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-muted">
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      {value} {label}
    </span>
  );
};

export const PatientPublicationMetricsRow = ({ item }: { item: PatientsDetailPublication }) => (
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
    {patientPublicationMetricOrder.map((metricId) => (
      <PatientPublicationMetricChip key={metricId} metric={item.metrics[metricId]} />
    ))}
  </div>
);

export const PatientPublicationFullContent = ({ item }: { item: PatientsDetailPublication }) => {
  const content = item.content.trim();

  return (
    <div className="rounded-2xl border border-border bg-surface-muted p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">
          Conteúdo completo do post
        </p>
        <span className="text-xs font-bold text-subtle">{formatDateTime(item.created_at)}</span>
      </div>
      <h3 className="mt-3 text-base font-bold text-foreground">
        {item.title.trim() || "Post sem título"}
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
        {content || "Sem conteúdo textual."}
      </p>
    </div>
  );
};

export const PublicationsTab = ({ detail }: { detail: AdminPatientDetail }) => {
  const [expandedPublicationId, setExpandedPublicationId] = useState<string | null>(null);
  const publications = detail.publications.items;

  return (
    <CardShell
      className="min-w-0 max-w-full overflow-hidden"
      data-patient-detail-section="publications-list"
    >
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <IconCircle icon={FileText} />
          <div>
            <h2 className="text-lg font-bold text-foreground">Publicações</h2>
            <p className="mt-1 text-sm text-muted">{detail.publications.coverage_note}</p>
          </div>
        </div>
      </div>

      {publications.length === 0 ? (
        <p className="p-5 text-sm font-bold text-muted">
          Nenhuma publicação foi encontrada para este paciente no período consultado.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {publications.map((item) => {
            const isExpanded = expandedPublicationId === item.id;

            return (
              <article
                className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-start"
                key={item.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="font-black">{item.type_label}</span>
                    <span aria-hidden className="font-bold">
                      ·
                    </span>
                    <span className="font-black">{item.community.name}</span>
                    <span aria-hidden className="font-bold">
                      ·
                    </span>
                    <span className="font-bold">{formatDateTime(item.created_at)}</span>
                    <span className="font-bold text-subtle">/{item.community.slug}</span>
                  </div>
                  <h3 className="mt-2 line-clamp-1 text-sm font-bold text-foreground sm:text-base">
                    {item.title.trim() || "Post sem título"}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted">
                    {item.excerpt.trim() || "Sem descrição textual."}
                  </p>
                  {isExpanded ? (
                    <div className="mt-4">
                      <PatientPublicationFullContent item={item} />
                    </div>
                  ) : null}
                </div>
                <div className="flex justify-end gap-2 lg:flex-col">
                  <button
                    aria-expanded={isExpanded}
                    aria-label={
                      isExpanded
                        ? "Ocultar conteúdo completo do post"
                        : "Expandir conteúdo completo do post"
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-border text-foreground transition hover:border-primary hover:text-primary"
                    onClick={() =>
                      setExpandedPublicationId((current) => (current === item.id ? null : item.id))
                    }
                    title={isExpanded ? "Ocultar conteúdo" : "Ver conteúdo completo"}
                    type="button"
                  >
                    {isExpanded ? (
                      <ChevronUp aria-hidden className="h-4 w-4" />
                    ) : (
                      <ChevronDown aria-hidden className="h-4 w-4" />
                    )}
                  </button>
                  <Link
                    aria-label="Ver estatísticas da publicação no Admin"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-primary/30 text-primary transition hover:bg-primary-soft"
                    href={item.admin_statistics_url}
                    title="Estatísticas"
                  >
                    <BarChart3 aria-hidden className="h-4 w-4" />
                    <span className="sr-only">Estatísticas</span>
                  </Link>
                  <Link
                    aria-label="Ver publicação no site"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-border text-foreground transition hover:border-primary hover:text-primary"
                    href={toPublicFrontendHref(item.public_url)}
                    rel="noreferrer"
                    target="_blank"
                    title="Ver no site"
                  >
                    <Eye aria-hidden className="h-4 w-4" />
                    <span className="sr-only">Ver no site</span>
                  </Link>
                </div>
                <div className="border-t border-border pt-3 lg:col-span-2">
                  <PatientPublicationMetricsRow item={item} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </CardShell>
  );
};

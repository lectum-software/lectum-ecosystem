"use client";

import { LockKeyhole, Pencil, Plus, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useWhatsappHistory } from "@/api/callers/whatsapp-reports";
import { getSafeApiErrorMessage } from "@/api/errors";
import type { WhatsappWeekHistoryItem } from "@/api/req/whatsapp-reports";
import { WhatsappWeekForm } from "@/components/analytics/whatsapp-week-form";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

const formatDate = (value: string | number) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
const weekLabel = (week: WhatsappWeekHistoryItem) =>
  `${formatDate(week.week_start)} a ${formatDate(new Date(week.week_end).getTime() - 1)}`;

export function AcquiredPatientsLogic() {
  const user = useAppSelector((state) => state.user);
  const { history, save } = useWhatsappHistory(user?.id ?? "");
  const [selected, setSelected] = useState<WhatsappWeekHistoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const returnRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const weeks = history.data?.pages.flatMap((page) => page.weeks) ?? [];
  const close = () => {
    if (!save.isPending) {
      setSelected(null);
      setError(null);
    }
  };

  return (
    <PrivateTemplate desktopSidebarDefaultCollapsed showMobileNavigation={false}>
      <section className="mx-auto grid w-full max-w-[430px] min-w-0 gap-4 md:max-w-3xl">
        <AppPageHeader
          title="Pacientes adquiridos"
          backHref="/app/profissional/estatisticas"
          backLabel="Voltar para Meus Analytics"
        />
        <p className="text-xs text-muted">Dados informados pelo psicólogo.</p>
        {history.isLoading ? <LoadingState label="Carregando resultados" /> : null}
        {history.isError ? (
          <InlineAlert variant="error" title="Não foi possível carregar os resultados">
            <Button variant="ghost" onClick={() => void history.refetch()}>
              Tentar novamente
            </Button>
          </InlineAlert>
        ) : null}
        {weeks.length ? (
          <ul className="min-w-0 divide-y divide-border border-y border-border">
            {weeks.map((week) => (
              <li key={week.week_start} className="grid min-w-0 gap-3 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold">{weekLabel(week)}</h2>
                    <p className="mt-1 text-xs text-muted">
                      {week.people_count.toLocaleString("pt-BR")}{" "}
                      {week.people_count === 1 ? "pessoa no WhatsApp" : "pessoas no WhatsApp"}
                    </p>
                  </div>
                  {week.editable ? (
                    <Button
                      variant="ghost"
                      className="h-10 shrink-0 px-2 text-primary"
                      aria-label={`${week.acquired_count === null ? "Informar" : "Editar"} resultado de ${weekLabel(week)}`}
                      onClick={(event) => {
                        returnRef.current = event.currentTarget;
                        setError(null);
                        setSelected(week);
                      }}
                    >
                      {week.acquired_count === null ? (
                        <Plus className="h-4 w-4" aria-hidden />
                      ) : (
                        <Pencil className="h-4 w-4" aria-hidden />
                      )}
                      {week.acquired_count === null ? "Informar" : "Editar"}
                    </Button>
                  ) : (
                    <span
                      className="flex h-10 shrink-0 items-center gap-1 text-xs text-muted"
                      title="Período encerrado para edição"
                    >
                      <LockKeyhole className="h-4 w-4" aria-hidden />
                      Somente leitura
                    </span>
                  )}
                </div>
                <p className="text-sm">
                  <span className="font-bold">
                    {week.acquired_count === null
                      ? "Não informado"
                      : week.acquired_count.toLocaleString("pt-BR")}
                  </span>
                  {week.acquired_count === null
                    ? ""
                    : week.acquired_count === 1
                      ? " paciente adquirido"
                      : " pacientes adquiridos"}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
        {history.hasNextPage ? (
          <Button
            variant="outline"
            disabled={history.isFetchingNextPage}
            onClick={() => void history.fetchNextPage()}
          >
            {history.isFetchingNextPage ? "Carregando..." : "Ver semanas anteriores"}
          </Button>
        ) : null}
      </section>
      <Modal
        open={Boolean(selected)}
        onClose={close}
        labelledBy={titleId}
        initialFocusRef={titleRef}
        returnFocusRef={returnRef}
      >
        <section className="grid max-h-full w-full min-w-0 max-w-md gap-4 overflow-y-auto rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-lectum-soft">
          <div className="flex items-center justify-between gap-2">
            <h2
              ref={titleRef}
              tabIndex={-1}
              id={titleId}
              className="text-lg font-bold outline-none"
            >
              Pacientes adquiridos
            </h2>
            <Button
              variant="ghost"
              className="h-10 w-10 shrink-0 p-0"
              aria-label="Fechar"
              title="Fechar"
              disabled={save.isPending}
              onClick={close}
            >
              <X className="h-5 w-5" aria-hidden />
            </Button>
          </div>
          {selected ? (
            <>
              <p className="text-sm font-semibold">{weekLabel(selected)}</p>
              <p className="text-sm text-muted">
                {selected.people_count}{" "}
                {selected.people_count === 1 ? "pessoa clicou" : "pessoas clicaram"} no seu link de
                WhatsApp pela Lectum.
              </p>
              <p className="text-sm">Quantas dessas pessoas agendaram um atendimento com você?</p>
              <WhatsappWeekForm
                key={selected.week_start}
                report={selected}
                pending={save.isPending}
                onSubmit={async (count) => {
                  try {
                    await save.mutateAsync({ start: selected.week_start.slice(0, 10), count });
                    setSelected(null);
                    setError(null);
                  } catch (err) {
                    setError(
                      getSafeApiErrorMessage(err, "Não foi possível salvar. Tente novamente."),
                    );
                  }
                }}
              />
            </>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
        </section>
      </Modal>
    </PrivateTemplate>
  );
}

"use client";
import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useWhatsappReports } from "@/api/callers/whatsapp-reports";
import { getSafeApiErrorMessage } from "@/api/errors";
import type { WhatsappWeekReport } from "@/api/req/whatsapp-reports";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/registry/new-york-v4/ui/button";
import { WhatsappWeekForm } from "./whatsapp-week-form";

const AUTOMATIC_PATHS = new Set([
  "/",
  "/app",
  "/app/perfil",
  "/app/notificacoes",
  "/app/profissional/estatisticas",
]);

export function WhatsappWeekPrompt({ userId, paused }: { userId: string; paused: boolean }) {
  const path = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement>(null);
  const requested = search.get("whatsapp_week");
  const explicitId = requested && /^[a-zA-Z0-9_-]{1,64}$/.test(requested) ? requested : null;
  const enabled = !paused && (Boolean(explicitId) || AUTOMATIC_PATHS.has(path));
  const { query, open, answer } = useWhatsappReports(userId, explicitId, enabled);
  const [report, setReport] = useState<WhatsappWeekReport | null>(null);
  const [openedAt, setOpenedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(new Set<string>());
  const mounted = useRef(true);
  useEffect(() => {
    if (!explicitId)
      for (const key of attempted.current)
        if (key.startsWith("manual:")) attempted.current.delete(key);
  }, [explicitId]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const openReport = open.mutateAsync;

  useEffect(() => {
    const candidate = query.data;
    if (!enabled || !candidate || !query.dataUpdatedAt || report) return;
    const key = `${explicitId ? "manual" : "auto"}:${candidate.id}`;
    if (attempted.current.has(key)) return;
    const tryOpen = () => {
      if (attempted.current.has(key)) return;
      if (document.visibilityState !== "visible") return;
      if (
        document.querySelector(
          'dialog[open], [role="dialog"], [role="alertdialog"], [contenteditable="true"]:focus',
        ) ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName ?? "")
      )
        return;
      attempted.current.add(key);
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      void openReport({ id: candidate.id, automatic: !explicitId })
        .then((value) => {
          if (mounted.current && value) {
            setOpenedAt(Date.now());
            setError(null);
            setReport(value);
          }
        })
        .catch(() => {
          if (mounted.current && explicitId)
            setError("Não foi possível abrir o resumo. Tente novamente.");
        });
    };
    const timer = window.setTimeout(tryOpen, explicitId ? 0 : 1500);
    const retry = window.setInterval(tryOpen, 3000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(retry);
    };
  }, [enabled, explicitId, openReport, query.data, query.dataUpdatedAt, report]);

  const close = () => {
    setReport(null);
    setError(null);
    if (explicitId) {
      const params = new URLSearchParams(search.toString());
      params.delete("whatsapp_week");
      router.replace(`${path}${params.size ? `?${params}` : ""}`, { scroll: false });
    }
  };
  const visible = Boolean(report || (explicitId && (query.isError || error)));
  return (
    <Modal
      open={visible}
      onClose={close}
      labelledBy={titleId}
      initialFocusRef={closeRef}
      returnFocusRef={returnFocusRef}
    >
      <section className="relative grid max-h-full w-full max-w-md gap-4 overflow-y-auto rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-lectum-soft">
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-extrabold">
            Resultados da semana
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Fechar"
            title="Fechar"
            onClick={close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {report ? (
          <>
            <p className="text-sm leading-6 text-muted">
              {openedAt - new Date(report.week_end).getTime() < 7 * 86400000
                ? "Na semana passada, de "
                : "Na semana de "}
              <strong>
                {report.start_label} a {report.end_label}
              </strong>
              ,{" "}
              <strong>
                {report.people_count}{" "}
                {report.people_count === 1 ? "pessoa clicou" : "pessoas clicaram"} no seu botão de
                WhatsApp neste período
              </strong>
              .
            </p>
            {report.editable !== false ? (
              <p className="text-sm leading-6">
                Quantos novos pacientes você adquiriu pela Lectum neste período?
              </p>
            ) : null}
            {report.editable === false ? (
              <div className="grid gap-2 text-sm">
                <p>
                  {report.acquired_count === null
                    ? "Resultado não informado."
                    : `Pacientes adquiridos: ${report.acquired_count}.`}
                </p>
                <p className="text-muted">Este período está disponível somente para consulta.</p>
              </div>
            ) : (
              <WhatsappWeekForm
                key={report.id}
                report={report}
                pending={answer.isPending}
                onSubmit={async (count) => {
                  try {
                    await answer.mutateAsync({ id: report.id, count });
                    close();
                  } catch (err) {
                    setError(
                      getSafeApiErrorMessage(err, "Não foi possível salvar. Tente novamente."),
                    );
                  }
                }}
              />
            )}
          </>
        ) : (
          <>
            <p>Não foi possível carregar este resumo.</p>
            <Button
              onClick={() => {
                if (explicitId) attempted.current.delete(`manual:${explicitId}`);
                setError(null);
                void query.refetch();
              }}
            >
              Tentar novamente
            </Button>
          </>
        )}
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </section>
    </Modal>
  );
}

"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { BillingPaymentHistoryItem } from "@/api/generator/types/billing";
import { downloadBillingInvoice } from "@/api/req/psychologist-billing";

const statusLabels: Record<string, string> = {
  queued: "Nota fiscal aguardando emissão",
  awaiting_activation: "Emissão fiscal ainda não ativada",
  awaiting_configuration: "Emissão fiscal aguardando configuração",
  pending: "Nota fiscal em processamento",
  processing: "Nota fiscal em processamento",
  authorized: "Nota fiscal aguardando disponibilização",
  blocked: "Nota fiscal aguardando regularização",
  failed: "Emissão fiscal pendente",
  rejected: "Nota fiscal em revisão",
  manual_review: "Nota fiscal em revisão",
  cancel_requested: "Cancelamento fiscal em análise",
  cancelled: "Nota fiscal cancelada",
};

export function InvoiceAction({
  invoice,
}: {
  invoice: NonNullable<BillingPaymentHistoryItem["invoice"]>;
}) {
  const [busy, setBusy] = useState(false);
  const isTest = invoice.mode === "test";
  const canDownload = invoice.status === "authorized" && invoice.downloadable;
  const download = async () => {
    if (busy || !canDownload) return;
    setBusy(true);
    try {
      const identifier = (invoice.number || invoice.id).replace(/[^A-Za-z0-9_-]/g, "-");
      const { blob, filename } = await downloadBillingInvoice(
        invoice.id,
        `Lectum-Nota-Fiscal-${isTest ? "Teste-" : ""}${identifier}.pdf`,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      toast.error("Não foi possível baixar a nota fiscal. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`${canDownload && !isTest ? "mt-1" : "mt-2"} grid gap-1 text-xs text-muted`}>
      {!canDownload ? <p>{statusLabels[invoice.status] ?? "Emissão fiscal pendente"}</p> : null}
      {isTest ? <p>Teste · sem valor fiscal</p> : null}
      {canDownload ? (
        <button
          type="button"
          disabled={busy}
          onClick={download}
          className="inline-flex min-h-6 w-fit items-center justify-self-end gap-1 whitespace-nowrap text-left text-[11px] font-semibold text-primary disabled:opacity-60"
          aria-label={isTest ? "Baixar nota fiscal de teste em PDF" : "Baixar nota fiscal em PDF"}
          aria-busy={busy}
        >
          {busy ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span className="font-semibold">Nota Fiscal</span>
        </button>
      ) : null}
    </div>
  );
}

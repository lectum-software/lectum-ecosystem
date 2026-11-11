"use client";

import { Download, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { FinancialHistoryInvoice } from "@/api/req/finance/history";
import { downloadAdminFinanceInvoice } from "@/api/req/finance/invoice-download";
import { formatInvoiceNumber, invoicePresentation } from "./presentation";

export const FinancialInvoiceAction = ({
  invoice,
  userId,
}: {
  invoice: FinancialHistoryInvoice | null;
  userId: string;
}) => {
  const [busy, setBusy] = useState(false);
  const downloading = useRef(false);
  const presentation = invoicePresentation(invoice);
  const number = invoice ? formatInvoiceNumber(invoice.number) : null;
  const download = async () => {
    if (downloading.current || !presentation.canDownload || !invoice || !userId) return;
    downloading.current = true;
    setBusy(true);
    try {
      await downloadAdminFinanceInvoice(invoice.id, userId);
    } catch {
      toast.error("Não foi possível baixar a nota fiscal. Tente novamente.");
    } finally {
      downloading.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="grid min-w-0 gap-1 text-xs leading-5 text-muted">
      <p>{presentation.label}</p>
      {number ? <p className="break-all">Nº {number}</p> : null}
      {presentation.isTest ? <p className="font-semibold">Teste · sem valor fiscal</p> : null}
      {presentation.canDownload && userId ? (
        <button
          aria-busy={busy}
          aria-label={presentation.isTest ? "Baixar NFS-e de teste em PDF" : "Baixar NFS-e em PDF"}
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-border bg-surface px-3 text-left text-xs font-semibold text-primary transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
          disabled={busy}
          onClick={() => void download()}
          type="button"
        >
          {busy ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Download aria-hidden className="h-4 w-4" />
          )}
          {busy ? "Baixando…" : "Baixar PDF"}
        </button>
      ) : null}
    </div>
  );
};

"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useAdminDialogLifecycle } from "@/hooks/use-admin-dialog-lifecycle";

export const ExpenseDialogShell = ({
  title,
  busy,
  onClose,
  children,
}: {
  title: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) => {
  const dialog = useAdminDialogLifecycle(onClose, { closeEnabled: !busy });
  return (
    <div
      aria-labelledby="expense-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-overlay p-3 sm:items-center"
      ref={dialog}
      role="dialog"
      tabIndex={-1}
    >
      <section className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-card border border-border bg-surface p-5 shadow-2xl sm:p-6">
        <header className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-foreground" id="expense-dialog-title">
            {title}
          </h2>
          <button
            aria-label="Fechar diálogo"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-control border border-border"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
};

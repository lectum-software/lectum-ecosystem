"use client";

import { useId, useRef } from "react";
import type { FullPublishedDoc } from "@/api/req/legal/types";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/registry/new-york-v4/ui/button";
import { LegalLinks } from "./links";
import { LEGAL_TITLES } from "./policy";
import { type LegalAcceptanceForm, useLegalAcceptanceForm } from "./use-form";

export const LegalAcceptanceModal = ({
  documents,
  disabled = false,
  error,
  onClose,
  onSubmit,
}: {
  documents: FullPublishedDoc[];
  disabled?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: LegalAcceptanceForm) => Promise<void>;
}) => {
  const { Form, formProps, hook } = useLegalAcceptanceForm(documents);
  const id = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement>(null);
  return (
    <Modal
      initialFocusRef={closeRef}
      labelledBy={`${id}-title`}
      onClose={onClose}
      open
      returnFocusRef={returnFocusRef}
    >
      <section className="max-h-full w-full max-w-lg overflow-y-auto overscroll-contain rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-lectum-soft sm:p-6">
        <h2 className="text-xl font-extrabold" id={`${id}-title`}>
          Termos e privacidade
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Revise os documentos publicados antes de confirmar. Você pode escolher Agora não e
          continuar navegando, sair da conta ou acessar suas configurações.
        </p>
        <ul className="my-4 grid gap-3">
          {documents.map((document) => (
            <li
              className="min-w-0 rounded-[var(--lectum-control-radius)] border border-border bg-surface-muted p-3"
              key={document.id}
            >
              <h3 className="break-words text-sm font-bold">
                {LEGAL_TITLES[document.kind]} — versão {document.version}
              </h3>
              <p className="mt-1 break-words text-sm text-muted">{document.title}</p>
              {document.change_summary.trim() ? (
                <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-muted [overflow-wrap:anywhere]">
                  {document.change_summary}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <LegalLinks className="mb-5 justify-start" documents={documents} newTab />
        <Form
          className="grid gap-2"
          fields={formProps.fields.map((field) => ({
            ...field,
            id: `${id}-${field.name}`,
            disabled,
          }))}
          hook={hook}
          onSubmit={hook.handleSubmit(async (values) => {
            if (!disabled) await onSubmit(values);
          })}
        >
          {error ? <InlineAlert variant="error">{error}</InlineAlert> : null}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button asChild className="w-full" variant="outline">
              <button onClick={onClose} ref={closeRef} type="button">
                Agora não
              </button>
            </Button>
            <Button className="w-full" disabled={disabled} type="submit">
              {disabled ? "Aguarde…" : "Confirmar declarações"}
            </Button>
          </div>
        </Form>
      </section>
    </Modal>
  );
};

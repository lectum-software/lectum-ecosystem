"use client";

import { useEffect, useId, useRef } from "react";
import { z } from "zod";
import type { FullPublishedDoc } from "@/api/req/legal/types";
import { Modal } from "@/components/ui/modal";
import { type Field, useFormList } from "@/hooks/form";
import { Button } from "@/registry/new-york-v4/ui/button";
import { adultBirthdateSchema } from "@/utils/birthdate";
import { legalSetKey } from "./policy";
import { registrationLegalField, registrationLegalSchema } from "./registration-field";

export const adultDeclarationSchema = z.object({
  birthdate: adultBirthdateSchema,
  legal_accepted: registrationLegalSchema,
});
export type AdultDeclarationForm = z.infer<typeof adultDeclarationSchema>;
const fields: Field<AdultDeclarationForm>[] = [
  {
    name: "birthdate",
    field: "calendar",
    label: "Data de nascimento",
    placeholder: "00/00/0000",
    autoComplete: "bday",
    dateDisplayFormat: "pt-BR",
    required: true,
    className: "w-full",
  },
];

// Mounted only by an explicit Google-registration click. No OAuth request before valid submit.
export const AdultDeclarationModal = ({
  onClose,
  onSubmit,
  documents,
  legalReady = false,
}: {
  legalReady?: boolean;
  documents: FullPublishedDoc[];
  onClose: () => void;
  onSubmit: (values: AdultDeclarationForm) => Promise<void>;
}) => {
  const { Form, formProps, hook } = useFormList<AdultDeclarationForm>({
    fields: [...fields, registrationLegalField(documents)],
    schema: adultDeclarationSchema,
    defaultValues: { birthdate: "", legal_accepted: false },
  });
  const documentKey = legalSetKey(documents);
  const { resetField } = hook;
  const previousDocumentKey = useRef(documentKey);
  useEffect(() => {
    if (previousDocumentKey.current === documentKey) return;
    previousDocumentKey.current = documentKey;
    resetField("legal_accepted");
  }, [documentKey, resetField]);
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
      <section className="max-h-full w-full max-w-[430px] overflow-y-auto rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-lectum-soft">
        <h2 className="text-xl font-extrabold" id={`${id}-title`}>
          Qual é sua data de nascimento?
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Para se cadastrar na Lectum, você precisa ter 18 anos ou mais.
        </p>
        <Form
          className="mt-5 grid gap-3"
          fields={formProps.fields.map((field) => ({ ...field, id: `${id}-${field.name}` }))}
          hook={hook}
          onSubmit={hook.handleSubmit(onSubmit)}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild variant="outline">
              <button onClick={onClose} ref={closeRef} type="button">
                Cancelar
              </button>
            </Button>
            <Button disabled={!legalReady || hook.formState.isSubmitting} type="submit">
              Continuar com Google
            </Button>
          </div>
        </Form>
      </section>
    </Modal>
  );
};

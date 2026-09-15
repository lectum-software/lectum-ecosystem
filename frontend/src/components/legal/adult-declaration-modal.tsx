"use client";

import { useId, useRef } from "react";
import { z } from "zod";
import { Modal } from "@/components/ui/modal";
import { type Field, useFormList } from "@/hooks/form";
import { Button } from "@/registry/new-york-v4/ui/button";
import { ADULT_DECLARATION, adultConfirmedSchema } from "./use-form";

export const adultDeclarationSchema = z.object({ adult_confirmed: adultConfirmedSchema });
export type AdultDeclarationForm = z.infer<typeof adultDeclarationSchema>;
const fields: Field<AdultDeclarationForm>[] = [
  { name: "adult_confirmed", field: "checkbox", label: ADULT_DECLARATION, className: "w-full" },
];

// Mounted only by an explicit Google-registration click. No OAuth request before valid submit.
export const AdultDeclarationModal = ({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (values: AdultDeclarationForm) => Promise<void>;
}) => {
  const { Form, formProps, hook } = useFormList<AdultDeclarationForm>({
    fields,
    schema: adultDeclarationSchema,
    defaultValues: { adult_confirmed: false },
  });
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
          Antes de criar sua conta
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Contas Lectum são exclusivas para pessoas com 18 anos ou mais. Confirme sua idade antes de
          continuar com Google.
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
            <Button disabled={hook.formState.isSubmitting} type="submit">
              Continuar com Google
            </Button>
          </div>
        </Form>
      </section>
    </Modal>
  );
};

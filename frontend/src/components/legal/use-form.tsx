"use client";

import { z } from "zod";
import type { AcceptLegalPayload, FullPublishedDoc } from "@/api/req/legal/types";
import { type Field, useFormList } from "@/hooks/form";
import { hasCompleteLegalSet, LEGAL_TITLES } from "./policy";

export const ADULT_DECLARATION = "Declaro que tenho 18 anos ou mais.";
export const adultConfirmedSchema = z.boolean().refine((value) => value === true, {
  message: "É necessário ter 18 anos ou mais para criar e usar uma conta.",
});

export const legalAcceptanceSchema = z.object({
  terms_accepted: z
    .boolean()
    .refine((value) => value === true, { message: "Confirme o aceite dos Termos de Serviço." }),
  privacy_acknowledged: z.boolean().refine((value) => value === true, {
    message: "Confirme a ciência da Política de Privacidade.",
  }),
  adult_confirmed: adultConfirmedSchema,
});
export type LegalAcceptanceForm = z.infer<typeof legalAcceptanceSchema>;

export const toLegalAcceptancePayload = (
  values: LegalAcceptanceForm,
  documents: FullPublishedDoc[],
): AcceptLegalPayload => {
  legalAcceptanceSchema.parse(values);
  if (!hasCompleteLegalSet({ configured: true, documents })) {
    throw new Error("Os documentos estão indisponíveis para confirmação.");
  }
  return {
    document_ids: documents.map((document) => document.id),
    terms_accepted: true,
    privacy_acknowledged: true,
    adult_confirmed: true,
  };
};

export const useLegalAcceptanceForm = (documents: FullPublishedDoc[]) => {
  const name = (kind: FullPublishedDoc["kind"]) => {
    const document = documents.find((entry) => entry.kind === kind);
    return `${LEGAL_TITLES[kind]} — versão ${document?.version ?? ""}`;
  };
  const fields: Field<LegalAcceptanceForm>[] = [
    {
      name: "terms_accepted",
      field: "checkbox",
      label: `Li e aceito os ${name("terms")}.`,
      className: "w-full",
    },
    {
      name: "privacy_acknowledged",
      field: "checkbox",
      label: `Li e estou ciente da ${name("privacy")}.`,
      className: "w-full",
    },
    { name: "adult_confirmed", field: "checkbox", label: ADULT_DECLARATION, className: "w-full" },
  ];
  return useFormList<LegalAcceptanceForm>({
    fields,
    schema: legalAcceptanceSchema,
    defaultValues: { terms_accepted: false, privacy_acknowledged: false, adult_confirmed: false },
  });
};

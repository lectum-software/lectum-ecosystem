"use client";

import Link from "next/link";
import { z } from "zod";
import type { FullPublishedDoc } from "@/api/req/legal/types";
import { LEGAL_PATHS, legalDocumentHref } from "./policy";

export const registrationLegalSchema = z.boolean().refine((value) => value, {
  message: "Aceite os Termos de Uso e confirme ciência da Política de Privacidade.",
});

export const registrationLegalField = (documents: FullPublishedDoc[], disabled = false) => {
  const href = (kind: FullPublishedDoc["kind"]) => {
    const doc = documents.find((item) => item.kind === kind);
    return doc ? legalDocumentHref(doc) : LEGAL_PATHS[kind];
  };
  const linkClass = "font-semibold text-primary underline underline-offset-4";
  return {
    name: "legal_accepted" as const,
    field: "checkbox" as const,
    disabled,
    className: "mt-3 w-full",
    inputClassName: "shrink-0",
    checkboxLabel: (
      <>
        Li e aceito os{" "}
        <Link className={linkClass} href={href("terms")} target="_blank" rel="noopener noreferrer">
          Termos de Uso
        </Link>{" "}
        e a{" "}
        <Link
          className={linkClass}
          href={href("privacy")}
          target="_blank"
          rel="noopener noreferrer"
        >
          Política de Privacidade
        </Link>
      </>
    ),
  };
};

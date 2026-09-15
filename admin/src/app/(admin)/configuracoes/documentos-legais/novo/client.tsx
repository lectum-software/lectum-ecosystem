"use client";

import { Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { useAdminLegalCreate } from "@/api/callers/legal";
import { resolveApiError } from "@/api/handle";
import type { AdminLegalKind } from "@/api/req/legal/types";
import { Form } from "@/hooks/form";
import { LEGAL_DRAFT_TEMPLATES } from "@/modules/legal/draft-templates";
import {
  LegalHeader,
  legalButtonClass,
  legalCardClass,
  legalPrimaryButtonClass,
} from "../components/common";
import { LegalDocumentReader } from "../components/document-reader";
import { LegalDraftFields } from "../components/draft-fields";
import { type LegalDraftForm, legalDocumentPath, legalKindLabel } from "../modules/legal-policy";
import { useLegalDraftForm } from "../use-form";

export const NewLegalDraftClient = ({ kind }: { kind: AdminLegalKind }) => {
  const router = useRouter();
  const mutation = useAdminLegalCreate();
  const locked = useRef(false);
  const form = useLegalDraftForm(LEGAL_DRAFT_TEMPLATES[kind]);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [title, body] = useWatch({ control: form.control, name: ["title", "body"] });
  const busy = mutation.isPending || form.formState.isSubmitting || createdId !== null;

  const save = async (values: LegalDraftForm) => {
    if (locked.current || createdId) return;
    locked.current = true;
    setError(null);
    try {
      const document = await mutation.mutateAsync({ ...values, kind });
      setCreatedId(document.id);
      router.replace(legalDocumentPath(document.id));
    } catch (cause) {
      setError(resolveApiError(cause));
      locked.current = false;
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      <LegalHeader
        title={`Nova minuta · ${legalKindLabel(kind)}`}
        description="Este formulário ainda não está salvo. Revise os dados da organização e substitua os marcadores. Salvar cria somente um rascunho, nunca uma publicação."
      />
      <section className={legalCardClass}>
        <p className="mb-5 rounded-2xl border border-warning/20 bg-warning/10 p-4 text-sm leading-6 text-foreground">
          Minuta de trabalho, sem aprovação jurídica. A publicação será uma ação separada,
          disponível somente após salvar e confirmar a revisão jurídica.
        </p>
        <Form className="min-w-0 space-y-4" form={form} onSubmit={save}>
          <LegalDraftFields disabled={busy} />
          {error ? (
            <p className="rounded-2xl bg-danger/10 p-4 text-sm text-danger" role="alert">
              {error} Seu texto foi mantido neste formulário.
            </p>
          ) : null}
          {createdId ? (
            <p className="text-sm text-success" role="status">
              Rascunho salvo.{" "}
              <Link className="underline" href={legalDocumentPath(createdId)}>
                Abrir documento
              </Link>
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              aria-expanded={preview}
              className={legalButtonClass}
              onClick={() => setPreview(!preview)}
              type="button"
            >
              {preview ? "Ocultar leitura" : "Visualizar leitura segura"}
            </button>
            <button className={legalPrimaryButtonClass} disabled={busy} type="submit">
              {busy ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <Save aria-hidden className="h-4 w-4" />
              )}
              {busy ? "Salvando rascunho..." : "Salvar rascunho"}
            </button>
          </div>
        </Form>
      </section>
      {preview ? <LegalDocumentReader body={body} title={title} /> : null}
    </div>
  );
};

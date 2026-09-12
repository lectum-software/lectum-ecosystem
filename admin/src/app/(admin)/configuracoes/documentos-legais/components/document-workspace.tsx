"use client";

import { Copy, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useWatch } from "react-hook-form";
import type { AdminLegalDocument } from "@/api/req/legal/types";
import { Form } from "@/hooks/form";
import { useLegalDocumentEditor } from "../hooks/use-document-editor";
import { legalDate, legalDocumentPath, legalKindLabel } from "../modules/legal-policy";
import { LegalAcceptances } from "./acceptances";
import {
  LegalHeader,
  LegalStatus,
  legalButtonClass,
  legalCardClass,
  legalPrimaryButtonClass,
} from "./common";
import { LegalDocumentReader } from "./document-reader";
import { LegalDraftFields } from "./draft-fields";
import { LegalPublishDialog } from "./publish-dialog";

export const LegalDocumentWorkspace = ({
  latest,
  reload,
}: {
  latest: AdminLegalDocument;
  reload: () => Promise<AdminLegalDocument | null>;
}) => {
  const editor = useLegalDocumentEditor({ latest, reload });
  const { document, form } = editor;
  const [preview, setPreview] = useState(false);
  const [showAcceptances, setShowAcceptances] = useState(false);
  const [title, body] = useWatch({ control: form.control, name: ["title", "body"] });
  const published = document.status === "published";

  return (
    <>
      <LegalHeader
        title={document.title}
        description={`${legalKindLabel(document.kind)} · versão ${document.version}. ${published ? "Conteúdo publicado e imutável. Para alterações, duplique como nova versão." : "Edite e salve o rascunho. Publicação exige revisão jurídica confirmada em uma etapa separada."}`}
      />
      <section className={legalCardClass}>
        <LegalStatus document={document} />
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">Revisão salva</dt>
            <dd className="mt-1 text-foreground">{document.revision}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Atualização</dt>
            <dd className="mt-1 text-foreground">{legalDate(document.updated_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Publicação</dt>
            <dd className="mt-1 text-foreground">{legalDate(document.published_at)}</dd>
          </div>
        </dl>
        {editor.notice ? (
          <p className="mt-4 rounded-2xl bg-success-soft p-4 text-sm text-success" role="status">
            {editor.notice}
          </p>
        ) : null}
        {editor.error ? (
          <p className="mt-4 rounded-2xl bg-danger/10 p-4 text-sm text-danger" role="alert">
            {editor.error}
          </p>
        ) : null}
        {editor.conflict ? (
          <div className="mt-4 rounded-2xl border border-warning/20 bg-warning/10 p-4" role="alert">
            <p className="text-sm leading-6 text-foreground">
              Esta versão foi alterada em outra sessão. Seu texto foi mantido, mas salvar e publicar
              estão bloqueados para não sobrescrever outra revisão. Copie suas alterações antes de
              carregar a versão atual.
            </p>
            <button
              className={`${legalButtonClass} mt-3 w-full sm:w-auto`}
              disabled={editor.busy}
              onClick={() => void editor.reloadCurrent()}
              type="button"
            >
              Descartar alterações locais e carregar versão atual
            </button>
          </div>
        ) : null}
        {published ? (
          <div className="mt-5 space-y-4">
            <h2 className="text-lg font-bold text-foreground">Resumo desta versão</h2>
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted">
              {document.change_summary}
            </p>
            <button
              className={`${legalButtonClass} w-full sm:w-auto`}
              disabled={editor.busy}
              onClick={() => void editor.duplicatePublished()}
              type="button"
            >
              {editor.busy ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <Copy aria-hidden className="h-4 w-4" />
              )}
              Duplicar como nova versão
            </button>
            <p className="text-xs leading-5 text-muted">
              Duplicar cria somente um novo rascunho. A publicação atual e seus aceites são
              preservados.
            </p>
            {editor.duplicateId ? (
              <Link
                className="block text-sm text-primary underline"
                href={legalDocumentPath(editor.duplicateId)}
              >
                Abrir novo rascunho
              </Link>
            ) : null}
          </div>
        ) : (
          <Form className="mt-6 min-w-0 space-y-4" form={form} onSubmit={editor.save}>
            <LegalDraftFields disabled={editor.busy} />
            <p className="min-h-5 text-xs text-muted" role="status">
              {editor.dirty ? "Alterações ainda não salvas." : "Você está vendo a revisão salva."}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                aria-expanded={preview}
                className={legalButtonClass}
                onClick={() => setPreview(!preview)}
                type="button"
              >
                {preview ? "Ocultar leitura" : "Visualizar leitura segura"}
              </button>
              <button
                className={legalPrimaryButtonClass}
                disabled={editor.busy || editor.conflict || !editor.dirty}
                type="submit"
              >
                {editor.busy ? (
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                ) : (
                  <Save aria-hidden className="h-4 w-4" />
                )}
                Salvar rascunho
              </button>
            </div>
          </Form>
        )}
      </section>
      {published || preview ? (
        <LegalDocumentReader
          body={published ? document.body : body}
          title={published ? document.title : title}
        />
      ) : null}
      {!published ? (
        <section className={legalCardClass}>
          <h2 className="text-lg font-bold text-foreground">Publicação</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Salvar não publica. A minuta deve ser revisada e aprovada pelo jurídico antes desta
            etapa. Depois de publicar, esta versão não poderá mais ser editada.
          </p>
          <p className="mt-3 min-h-5 text-sm text-muted" id="legal-publish-block">
            {editor.publishBlock ||
              "Conteúdo salvo atende às verificações de preenchimento. Isso não substitui revisão jurídica."}
          </p>
          <button
            aria-describedby="legal-publish-block"
            className={`${legalPrimaryButtonClass} mt-4 w-full sm:w-auto`}
            disabled={editor.busy || Boolean(editor.publishBlock)}
            onClick={() => editor.setPublishOpen(true)}
            type="button"
          >
            Revisar e publicar
          </button>
        </section>
      ) : null}
      <section className={legalCardClass}>
        <button
          aria-controls="legal-acceptances"
          aria-expanded={showAcceptances}
          className={`${legalButtonClass} w-full sm:w-auto`}
          onClick={() => setShowAcceptances(!showAcceptances)}
          type="button"
        >
          {showAcceptances ? "Ocultar aceites" : "Consultar aceites desta versão"}
        </button>
      </section>
      <div id="legal-acceptances">
        {showAcceptances ? <LegalAcceptances document={document} key={document.id} /> : null}
      </div>
      {editor.publishOpen ? (
        <LegalPublishDialog
          blocked={editor.publishBlock}
          busy={editor.busy}
          document={document}
          onClose={() => editor.setPublishOpen(false)}
          onPublish={editor.confirmPublish}
        />
      ) : null}
    </>
  );
};

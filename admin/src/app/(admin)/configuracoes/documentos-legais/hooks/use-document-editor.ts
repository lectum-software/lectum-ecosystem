"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  useAdminLegalDuplicate,
  useAdminLegalPublish,
  useAdminLegalUpdate,
} from "@/api/callers/legal";
import { resolveApiError } from "@/api/handle";
import type { AdminLegalDocument } from "@/api/req/legal/types";
import {
  getLegalPublishBlock,
  isLegalRevisionConflict,
  type LegalDraftForm,
  type LegalReviewForm,
  legalDocumentPath,
  legalReviewSchema,
  toLegalDraftValues,
} from "../modules/legal-policy";
import { useLegalDraftForm } from "../use-form";

export const useLegalDocumentEditor = ({
  latest,
  reload,
}: {
  latest: AdminLegalDocument;
  reload: () => Promise<AdminLegalDocument | null>;
}) => {
  const router = useRouter();
  // Background queries must never replace unsaved text or advance its CAS revision.
  const [document, setDocument] = useState(latest);
  const form = useLegalDraftForm(toLegalDraftValues(document));
  const update = useAdminLegalUpdate();
  const publish = useAdminLegalPublish();
  const duplicate = useAdminLegalDuplicate();
  const locked = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [conflictDetected, setConflictDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const busy =
    update.isPending ||
    publish.isPending ||
    duplicate.isPending ||
    refreshing ||
    duplicateId !== null;
  const conflict =
    conflictDetected || latest.revision !== document.revision || latest.status !== document.status;
  const dirty = form.formState.isDirty;
  const publishBlock = conflict
    ? "Carregue a versão atual antes de publicar."
    : dirty
      ? "Salve as alterações e revise a leitura antes de publicar."
      : getLegalPublishBlock(document);

  const acceptDocument = (next: AdminLegalDocument) => {
    setDocument(next);
    form.reset(toLegalDraftValues(next));
    setConflictDetected(false);
    setError(null);
  };

  const failure = (cause: unknown) => {
    if (isLegalRevisionConflict(cause)) {
      setConflictDetected(true);
      setError(null);
    } else {
      setError(resolveApiError(cause));
    }
  };

  const save = async (values: LegalDraftForm) => {
    if (locked.current || busy || conflict || document.status !== "draft") return;
    locked.current = true;
    setError(null);
    setNotice(null);
    try {
      const next = await update.mutateAsync({
        id: document.id,
        input: { ...values, revision: document.revision },
      });
      acceptDocument(next);
      setNotice("Rascunho salvo. Nenhum documento foi publicado.");
    } catch (cause) {
      failure(cause);
    } finally {
      locked.current = false;
    }
  };

  const confirmPublish = async (values: LegalReviewForm) => {
    if (locked.current || busy || publishBlock || !legalReviewSchema.safeParse(values).success)
      return;
    locked.current = true;
    setError(null);
    setNotice(null);
    try {
      const next = await publish.mutateAsync({
        id: document.id,
        input: { revision: document.revision, review_confirmed: true },
      });
      acceptDocument(next);
      setNotice("Documento publicado. Esta versão não pode mais ser editada.");
      setPublishOpen(false);
    } catch (cause) {
      failure(cause);
      setPublishOpen(false);
    } finally {
      locked.current = false;
    }
  };

  const reloadCurrent = async () => {
    if (locked.current || busy) return;
    locked.current = true;
    setRefreshing(true);
    setNotice(null);
    try {
      const next = await reload();
      if (next) {
        acceptDocument(next);
        setNotice("Versão atual carregada. Revise o texto antes de continuar.");
      } else {
        setError("Não foi possível carregar a versão atual. Seu texto foi mantido.");
      }
    } catch (cause) {
      failure(cause);
    } finally {
      locked.current = false;
      setRefreshing(false);
    }
  };

  const duplicatePublished = async () => {
    if (locked.current || busy || document.status !== "published") return;
    locked.current = true;
    setError(null);
    try {
      const next = await duplicate.mutateAsync(document.id);
      setDuplicateId(next.id);
      router.push(legalDocumentPath(next.id));
    } catch (cause) {
      failure(cause);
    } finally {
      locked.current = false;
    }
  };

  return {
    busy,
    conflict,
    confirmPublish,
    dirty,
    document,
    duplicateId,
    duplicatePublished,
    error,
    form,
    notice,
    publishBlock,
    publishOpen,
    reloadCurrent,
    save,
    setPublishOpen,
  };
};

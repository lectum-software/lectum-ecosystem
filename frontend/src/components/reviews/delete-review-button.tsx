"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useDeletePatientReview } from "@/api/callers/reviews";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/registry/new-york-v4/ui/button";

export const DeleteReviewButton = ({
  reviewId,
  onDeleted,
}: {
  reviewId: string;
  onDeleted: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deletion = useDeletePatientReview(() => {
    setOpen(false);
    toast.success("Avalia\u00e7\u00e3o exclu\u00edda.");
    onDeleted();
  });
  const close = () => {
    if (!deletion.isPending) setOpen(false);
  };
  const titleId = `delete-review-${reviewId}`;

  return (
    <>
      <Button
        asChild
        aria-label="Excluir minha avaliação"
        className="ml-auto h-9 w-9 shrink-0 p-0 text-muted hover:text-danger"
        onClick={() => {
          deletion.reset();
          setOpen(true);
        }}
        title="Excluir minha avaliação"
        type="button"
        variant="ghost"
      >
        <button ref={triggerRef} type="button">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </Button>
      <Modal
        initialFocusRef={cancelRef}
        labelledBy={titleId}
        onClose={close}
        open={open}
        returnFocusRef={triggerRef}
      >
        <section
          aria-busy={deletion.isPending}
          className="w-full max-w-[430px] rounded-lg border border-border bg-surface p-5 shadow-lectum-soft"
        >
          <h2 className="text-xl font-bold" id={titleId}>
            {"Excluir sua avalia\u00e7\u00e3o?"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            {
              "Sua nota, seu depoimento e a resposta do profissional deixar\u00e3o de aparecer. Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita."
            }
          </p>
          {deletion.isError ? (
            <InlineAlert title="Não foi possível excluir" variant="error">
              {"Tente novamente em instantes."}
            </InlineAlert>
          ) : null}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button
              asChild
              disabled={deletion.isPending}
              onClick={close}
              type="button"
              variant="outline"
            >
              <button ref={cancelRef} type="button">
                Cancelar
              </button>
            </Button>
            <Button
              disabled={deletion.isPending}
              onClick={() => {
                if (!deletion.isPending) deletion.mutate(reviewId);
              }}
              type="button"
              variant="destructive"
            >
              {deletion.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              Excluir
            </Button>
          </div>
        </section>
      </Modal>
    </>
  );
};

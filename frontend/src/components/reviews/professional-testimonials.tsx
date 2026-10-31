"use client";

import { Eye, EyeOff, Pencil, Reply, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useDirectoryPsychologist } from "@/api/callers/directory";
import { useInfinitePsychologistReviews } from "@/api/callers/psychologist-reviews";
import type { PsychologistReview } from "@/api/generator/types/psychologist-reviews";
import {
  deleteReviewResponse,
  respondPsychologistReview,
  setReviewVisibility,
} from "@/api/req/psychologist-reviews";
import { useReviewResponseForm } from "@/app/app/professional/reviews/use-form";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { profileSectionTabStyles as styles } from "@/components/ui/profile-section-tab-styles";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { flattenListPages } from "@/utils/infinite-list";
import { TestimonialCard } from "./testimonial-card";
import type { TestimonialProfessional } from "./testimonial-professional";
import { useTestimonialMutation } from "./use-testimonial-mutation";

const ManagedTestimonial = ({
  review,
  professional,
}: {
  review: PsychologistReview;
  professional?: TestimonialProfessional;
}) => {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { Form, formProps, hook } = useReviewResponseForm(review.response || "");
  const response = useTestimonialMutation(
    (text: string) => respondPsychologistReview(review.id, { response: text }),
    () => setEditing(false),
  );
  const visibility = useTestimonialMutation((hidden: boolean) =>
    setReviewVisibility(review.id, hidden),
  );
  const deletion = useTestimonialMutation(
    () => deleteReviewResponse(review.id),
    () => setConfirmDelete(false),
  );
  const beginEdit = () => {
    hook.reset({ response: review.response || "" });
    setEditing(true);
  };
  const hidden = review.status === "oculta_profissional";
  return (
    <TestimonialCard
      review={review}
      responseName="Sua resposta"
      professional={professional}
      actions={
        review.status !== "oculta" ? (
          <Button
            variant="ghost"
            className="h-10 w-10 p-0"
            title={hidden ? "Exibir no perfil" : "Ocultar do perfil"}
            aria-label={hidden ? "Exibir no perfil" : "Ocultar do perfil"}
            disabled={visibility.isPending}
            onClick={() => visibility.mutate(!hidden)}
          >
            {hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </Button>
        ) : null
      }
      responseActions={
        <div className="flex shrink-0">
          <Button
            variant="ghost"
            className="h-10 w-10 p-0"
            title="Editar resposta"
            aria-label="Editar resposta"
            onClick={beginEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            className="h-10 w-10 p-0"
            title="Excluir resposta"
            aria-label="Excluir resposta"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      }
    >
      {!review.response && !editing ? (
        <Button variant="ghost" className="ml-10 mt-2 text-primary" onClick={beginEdit}>
          <Reply className="size-4" />
          Responder
        </Button>
      ) : null}
      {review.status === "oculta" || hidden ? (
        <p className="mt-3 text-xs text-muted">Não exibido no perfil público</p>
      ) : null}
      {editing ? (
        <div className="ml-11 mt-3">
          <Form
            {...formProps}
            className="grid gap-1"
            onSubmit={hook.handleSubmit((values) => response.mutate(values.response))}
          >
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                type="button"
                disabled={response.isPending}
                onClick={() => setEditing(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="h-10 w-10 p-0"
                aria-label="Enviar resposta"
                title="Enviar resposta"
                disabled={response.isPending}
              >
                <Send className="size-4" />
              </Button>
            </div>
          </Form>
        </div>
      ) : null}
      {confirmDelete ? (
        <div className="mt-3" role="alert">
          <p className="text-sm">Excluir sua resposta?</p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deletion.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletion.mutate(undefined)}
              disabled={deletion.isPending}
            >
              Excluir resposta
            </Button>
          </div>
        </div>
      ) : null}
      {response.isError || visibility.isError || deletion.isError ? (
        <InlineAlert title="Não foi possível salvar" variant="error">
          Tente novamente. Nenhuma alteração foi confirmada.
        </InlineAlert>
      ) : null}
    </TestimonialCard>
  );
};

export const ProfessionalTestimonials = () => {
  const user = useAppSelector((state) => state.user);
  const professional = useDirectoryPsychologist(user?.role === "psicologo" ? (user.id ?? "") : "");
  const [filter, setFilter] = useState<"visible" | "hidden" | "all">("visible");
  const query = useInfinitePsychologistReviews({ limit: 20, visibility: filter });
  const data = query.data?.pages[0];
  const items = flattenListPages(query.data?.pages);
  return (
    <PrivateTemplate desktopSidebarDefaultCollapsed showMobileNavigation={false}>
      <section className="mx-auto grid w-full max-w-2xl gap-4">
        <AppPageHeader
          backHref="/app/perfil"
          backLabel="Voltar para perfil"
          title="Meus Depoimentos"
        />
        {data?.access.can_receive_reviews === false ? (
          <InlineAlert title="Recebimento de novos depoimentos pausado" variant="warning">
            <p>
              Seus depoimentos existentes continuam disponíveis. Você pode responder e gerenciar a
              exibição deles.
            </p>
            <Link className="text-primary" href="/app/profissional/assinatura">
              Ver Plano Profissional
            </Link>
          </InlineAlert>
        ) : null}
        <div className={styles.list} role="tablist" aria-label="Filtrar depoimentos">
          {(
            [
              ["visible", "Visíveis"],
              ["hidden", "Ocultos"],
              ["all", "Todos"],
            ] as const
          ).map(([id, label], index, tabs) => (
            <button
              type="button"
              role="tab"
              aria-selected={filter === id}
              key={id}
              onClick={() => setFilter(id)}
              id={`managed-testimonials-tab-${id}`}
              tabIndex={filter === id ? 0 : -1}
              onKeyDown={(event) => {
                const nextIndex =
                  event.key === "ArrowRight"
                    ? (index + 1) % tabs.length
                    : event.key === "ArrowLeft"
                      ? (index + tabs.length - 1) % tabs.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? tabs.length - 1
                          : null;
                if (nextIndex === null) return;
                event.preventDefault();
                setFilter(tabs[nextIndex][0]);
                document.getElementById(`managed-testimonials-tab-${tabs[nextIndex][0]}`)?.focus();
              }}
              className={cn(styles.button, filter === id ? styles.active : styles.inactive)}
            >
              <span className={styles.label}>{label}</span>
              <span className={styles.count}>
                {(
                  data?.visibility_counts?.[id] ?? (filter === id ? data?.count : undefined)
                )?.toLocaleString("pt-BR") ?? "…"}
              </span>
            </button>
          ))}
        </div>
        {query.isLoading ? <LoadingState label="Carregando depoimentos" /> : null}
        {query.isError ? (
          <InlineAlert title="Não foi possível carregar" variant="error">
            <Button variant="ghost" onClick={() => query.refetch()}>
              Tentar novamente
            </Button>
          </InlineAlert>
        ) : null}
        {!query.isLoading && !query.isError && !items.length ? (
          <p className="py-10 text-center text-muted">Nenhum depoimento nesta lista.</p>
        ) : null}
        <div className="divide-y divide-border bg-surface px-4" data-testimonial-list>
          {items.map((review) => (
            <ManagedTestimonial key={review.id} review={review} professional={professional.data} />
          ))}
        </div>
        {query.hasNextPage ? (
          <Button
            variant="ghost"
            disabled={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            Ver mais depoimentos
          </Button>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};

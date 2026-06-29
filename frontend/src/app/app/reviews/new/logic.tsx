"use client";

import { ArrowLeft, Send, Star, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useCreatePatientReview, useReviewEligibility } from "@/api/callers/reviews";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { formatCrpLabel } from "@/utils/crp";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { useReviewForm } from "./use-form";

const criteria = ["Acolhimento", "Clareza", "Pontualidade"];

const reasonText = (reason?: string) => {
  if (reason === "already_reviewed")
    return "Você já avaliou este profissional. Consulte sua lista de avaliações feitas.";
  if (reason === "own_profile") return "Não é possível avaliar o próprio perfil.";
  return "Não foi possível encontrar este profissional para avaliação.";
};
const getPsychologistTitle = (gender?: string | null) => {
  const normalized = gender?.toLowerCase();

  return normalized === "feminino" ? "Psicóloga" : "Psicólogo";
};

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const ReviewProfessionalAvatar = ({ avatar, name }: { avatar?: string | null; name: string }) => {
  const avatarSrc = resolvePublicMediaUrl(avatar ?? null);

  return (
    <div className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-primary-soft text-3xl font-bold text-primary ring-2 ring-white shadow-[0_10px_24px_rgb(48_140_232_/_12%)] dark:ring-surface">
      {avatarSrc ? (
        <Image
          alt={`Foto de perfil de ${name}`}
          className="object-cover"
          fill
          priority
          sizes="96px"
          src={avatarSrc}
          unoptimized={isPublicMediaUrl(avatar ?? null)}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
};

export const ReviewsNewLogic = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showValidationMessages, setShowValidationMessages] = useState(false);
  const psychologistId = searchParams.get("psychologist_id") || searchParams.get("id") || "";
  const eligibility = useReviewEligibility(psychologistId, Boolean(psychologistId));
  const form = useReviewForm(psychologistId);
  const { Form, formProps, hook } = form;
  const mutation = useCreatePatientReview({
    onSuccess: (data) =>
      router.replace(`/app/reviews/success?psychologist_id=${data.psychologist_id}`),
  });
  const professional = eligibility.data;
  const stars = useMemo(() => Array.from({ length: 5 }, (_, index) => index + 1), []);
  const selectedRating = Number(hook.watch("rating") || 0);
  const commentValue = String(hook.watch("comment") ?? "");
  const reviewReady = selectedRating >= 1 && selectedRating <= 5 && commentValue.trim().length > 0;
  const submitDisabled = mutation.isPending || !reviewReady;
  const shouldShowRatingError =
    showValidationMessages ||
    hook.formState.isSubmitted ||
    Boolean(hook.formState.touchedFields.rating);
  const ratingError =
    shouldShowRatingError && !selectedRating
      ? (hook.formState.errors.rating?.message ?? "Selecione uma nota para o profissional.")
      : hook.formState.errors.rating?.message;
  const professionalInfo = professional
    ? `${getPsychologistTitle(professional.psychologist_gender)} • ${formatCrpLabel(
        professional.psychologist_crp,
      )}`
    : "";

  const handleInvalidSubmitAttempt = () => {
    if (reviewReady || mutation.isPending) return;
    setShowValidationMessages(true);
    void hook.trigger(["rating", "comment"]);
  };

  const handleSelectRating = (value: number) => {
    hook.setValue("rating", String(value), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  if (!psychologistId) {
    return (
      <PrivateTemplate>
        <EmptyState
          icon={UserRound}
          title="Escolha um psicólogo para avaliar"
          description="A avaliação precisa estar vinculada a um profissional real da Lectum."
          action={
            <Button asChild>
              <Link href="/psychologists">Buscar psicólogos</Link>
            </Button>
          }
        />
      </PrivateTemplate>
    );
  }

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-2xl">
        <header className="flex items-center justify-between px-1 pb-1">
          <Button asChild variant="ghost" className="h-10 w-10 px-0">
            <Link aria-label="Voltar" href={`/psychologists/${psychologistId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-extrabold text-foreground">Avaliar Profissional</h1>
          <span className="h-10 w-10" />
        </header>

        {eligibility.isLoading ? <LoadingState label="Carregando profissional" /> : null}
        {eligibility.isError ? (
          <InlineAlert title="Não foi possível verificar" variant="error">
            Não foi possível conectar à API agora. Tente novamente em instantes.
          </InlineAlert>
        ) : null}

        {professional && !professional.eligible ? (
          <EmptyState
            icon={Star}
            title="Avaliação indisponível"
            description={reasonText(professional.reason)}
            action={
              <Button asChild variant="outline">
                <Link
                  href={
                    professional.reason === "already_reviewed"
                      ? "/app/reviews"
                      : `/psychologists/${psychologistId}`
                  }
                >
                  Continuar
                </Link>
              </Button>
            }
          />
        ) : null}

        {professional?.eligible ? (
          <>
            <section className="grid justify-items-center gap-2 rounded-[var(--lectum-card-radius)] border border-border bg-surface px-6 py-6 text-center shadow-[var(--lectum-shadow-soft)]">
              <ReviewProfessionalAvatar
                avatar={professional.psychologist_avatar}
                name={professional.psychologist_name}
              />
              <h2 className="inline-flex max-w-full items-center justify-center gap-1.5 text-center text-2xl font-extrabold text-foreground">
                <span className="min-w-0 truncate">{professional.psychologist_name}</span>
                {professional.psychologist_verified ? (
                  <VerifiedBadgeIcon aria-label="Perfil verificado" className="h-[18px] w-[18px]" />
                ) : null}
              </h2>
              <p className="text-sm font-semibold text-muted">{professionalInfo}</p>
            </section>

            <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted/60 p-4 text-center">
              <p className="text-sm font-bold text-foreground">Sua nota para o profissional</p>
              <fieldset className="mt-3 flex justify-center gap-2.5 text-warning">
                <legend className="sr-only">Selecionar nota de 1 a 5 estrelas</legend>
                {stars.map((star) => (
                  <label
                    className="rounded-full p-1 text-[#D97706] transition hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]/35"
                    key={star}
                  >
                    <input
                      aria-label={`${star} estrela${star === 1 ? "" : "s"}`}
                      checked={selectedRating === star}
                      className="sr-only"
                      name="rating-stars"
                      onChange={() => handleSelectRating(star)}
                      type="radio"
                      value={star}
                    />
                    <Star
                      className={cn(
                        "h-7 w-7 transition",
                        selectedRating >= star ? "fill-current" : "fill-transparent",
                      )}
                      aria-hidden
                    />
                  </label>
                ))}
              </fieldset>
              <span className="mt-2 block min-h-4 text-xs font-medium leading-4 text-danger">
                {ratingError}
              </span>
              <p className="mt-2 text-xs text-muted">
                Avalie acolhimento, clareza e experiência geral.
              </p>
            </section>

            <div className="grid grid-cols-3 gap-2">
              {criteria.map((item) => (
                <span
                  className="rounded-2xl border border-border bg-surface px-3 py-2 text-center text-xs font-semibold text-muted"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>

            <Form
              className="grid gap-4"
              {...formProps}
              onSubmit={hook.handleSubmit((values) =>
                mutation.mutate({
                  ...values,
                  rating: Number(values.rating),
                  comment: values.comment.trim(),
                }),
              )}
            >
              <div onPointerDownCapture={handleInvalidSubmitAttempt}>
                <Button className="w-full" disabled={submitDisabled} type="submit">
                  <Send className="h-4 w-4" />
                  {mutation.isPending ? "Enviando..." : "Enviar Avaliação"}
                </Button>
              </div>
            </Form>
          </>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};

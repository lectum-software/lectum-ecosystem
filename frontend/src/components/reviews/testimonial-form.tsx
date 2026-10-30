"use client";

import { Star } from "lucide-react";
import { useEffect } from "react";
import { createPatientReview, updatePatientReview } from "@/api/req/reviews";
import { useReviewForm } from "@/app/app/reviews/new/use-form";
import { InlineAlert } from "@/components/ui/inline-alert";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { useTestimonialMutation } from "./use-testimonial-mutation";

export const TestimonialForm = ({
  psychologistId,
  initial,
  onSuccess,
  onStateChange,
}: {
  psychologistId: string;
  initial?: { id: string; rating: number; comment: string | null };
  onSuccess: () => void;
  onStateChange?: (state: { dirty: boolean; submitting: boolean }) => void;
}) => {
  const { Form, formProps, hook } = useReviewForm(psychologistId);
  const { reset } = hook;
  useEffect(() => {
    reset({
      psychologist_id: psychologistId,
      rating: initial ? String(initial.rating) : "",
      comment: initial?.comment || "",
    });
  }, [initial, psychologistId, reset]);
  const mutation = useTestimonialMutation(
    (body: { psychologist_id: string; rating: number; comment: string }) =>
      initial ? updatePatientReview(initial.id, body) : createPatientReview(body),
    onSuccess,
  );
  const rating = Number(hook.watch("rating") || 0);
  const comment = hook.watch("comment") || "";
  const dirty = rating !== (initial?.rating ?? 0) || comment !== (initial?.comment ?? "");
  useEffect(() => {
    onStateChange?.({ dirty, submitting: mutation.isPending });
  }, [dirty, mutation.isPending, onStateChange]);
  return (
    <div>
      <p className="text-base font-semibold">
        Como foi sua experiência com as respostas e os conteúdos deste psicólogo?
      </p>
      <fieldset className="my-4 flex justify-center gap-2">
        <legend className="sr-only">Nota em estrelas</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="relative grid size-11 cursor-pointer place-items-center rounded-full text-rating has-focus-visible:ring-2 has-focus-visible:ring-primary"
          >
            <input
              type="radio"
              name="testimonial-rating"
              value={n}
              checked={rating === n}
              aria-label={`${n} estrelas`}
              className="sr-only"
              onChange={() => hook.setValue("rating", String(n), { shouldValidate: true })}
            />
            <Star aria-hidden className={cn("size-7", rating >= n && "fill-current")} />
          </label>
        ))}
      </fieldset>
      <Form
        {...formProps}
        className="grid gap-3"
        onSubmit={hook.handleSubmit((values) =>
          mutation.mutate({
            ...values,
            rating: Number(values.rating),
            comment: values.comment.trim(),
          }),
        )}
      >
        {mutation.isError ? (
          <InlineAlert title="Não foi possível salvar" variant="error">
            Tente novamente. Seu texto foi mantido.
          </InlineAlert>
        ) : null}
        <Button
          type="submit"
          disabled={mutation.isPending || !rating || !comment.trim()}
          className="w-full rounded-full"
        >
          {mutation.isPending
            ? "Salvando..."
            : initial
              ? "Salvar depoimento"
              : "Publicar depoimento"}
        </Button>
      </Form>
    </div>
  );
};

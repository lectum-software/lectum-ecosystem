"use client";

import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  type TestimonialProfessional,
  TestimonialProfessionalIdentity,
} from "./testimonial-professional";

export type TestimonialDisplay = {
  id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  responded_at?: string | null;
  created_at: string;
  author: { name: string; initials?: string };
};

export const TestimonialCard = ({
  review,
  actions,
  responseActions,
  responseName = "Resposta do psicólogo",
  professional,
  children,
}: {
  review: TestimonialDisplay;
  actions?: ReactNode;
  responseActions?: ReactNode;
  responseName?: string;
  professional?: TestimonialProfessional;
  children?: ReactNode;
}) => (
  <article className="min-w-0 py-4" data-testimonial-card>
    <div className="flex items-start gap-2.5">
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-muted text-xs font-semibold text-muted"
      >
        {review.author.initials || review.author.name.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="break-words text-sm font-semibold">{review.author.name}</h3>
            <time className="text-xs text-muted" dateTime={review.created_at}>
              {new Date(review.created_at).toLocaleDateString("pt-BR")}
            </time>
          </div>
          {actions}
        </div>
        <span
          className="mt-1.5 mb-2 flex gap-0.5 text-rating"
          role="img"
          aria-label={`${review.rating} de 5 estrelas`}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              aria-hidden
              className={cn("size-4", n <= review.rating && "fill-current")}
            />
          ))}
        </span>
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
          {review.comment}
        </p>
      </div>
    </div>
    {review.response ? (
      <div className="ml-4 mt-4 min-w-0 border-l border-border pl-4">
        <TestimonialProfessionalIdentity
          professional={professional}
          fallbackName={responseName}
          compact
        />
        <div className="min-w-0 pl-[42px]">
          {review.responded_at ? (
            <time className="text-xs text-muted" dateTime={review.responded_at}>
              {new Date(review.responded_at).toLocaleDateString("pt-BR")}
            </time>
          ) : null}
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
            {review.response}
          </p>
          {responseActions}
        </div>
      </div>
    ) : null}
    {children}
  </article>
);

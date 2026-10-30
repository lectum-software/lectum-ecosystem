"use client";

import { Star, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
  children,
}: {
  review: TestimonialDisplay;
  actions?: ReactNode;
  responseActions?: ReactNode;
  responseName?: string;
  children?: ReactNode;
}) => (
  <article className="rounded-[20px] border border-border bg-surface p-4">
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">
        {review.author.initials || review.author.name.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="break-words text-sm font-bold">{review.author.name}</h3>
            <time className="text-xs text-muted" dateTime={review.created_at}>
              {new Date(review.created_at).toLocaleDateString("pt-BR")}
            </time>
          </div>
          {actions}
        </div>
        <span
          className="my-2 flex gap-0.5 text-rating"
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
      <div className="ml-5 mt-4 border-l border-border pl-7">
        <div className="flex gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <UserRound className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold">{responseName}</h4>
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
      </div>
    ) : null}
    {children}
  </article>
);

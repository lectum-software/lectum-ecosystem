"use client";

import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { AuthorAvatar } from "@/components/community/community-post-card-author";
import { cn } from "@/lib/utils";
import { formatCommunityPostTime } from "@/utils/community-display";
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
  author: { name: string; initials?: string; avatar?: string | null };
};

export const TestimonialCard = ({
  review,
  actions,
  responseActions,
  responseName = "Resposta do psicólogo",
  professional,
  ownAuthorAvatar,
  context,
  children,
}: {
  review: TestimonialDisplay;
  actions?: ReactNode;
  responseActions?: ReactNode;
  responseName?: string;
  professional?: TestimonialProfessional;
  ownAuthorAvatar?: string | null;
  context?: ReactNode;
  children?: ReactNode;
}) => (
  <article className="min-w-0 bg-surface py-5" data-testimonial-card>
    {context ? <div className="mb-3 text-xs text-muted">{context}</div> : null}
    <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3">
      <div className="flex justify-center [&>span]:size-8">
        <AuthorAvatar
          avatar={ownAuthorAvatar ?? review.author.avatar ?? null}
          name={review.author.name}
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-sm font-semibold leading-5">{review.author.name}</h3>
            <div
              className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1"
              data-testimonial-rating-meta
            >
              <span
                className="flex shrink-0 gap-0.5 text-rating"
                role="img"
                aria-label={`${review.rating} de 5 estrelas`}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    aria-hidden
                    className={cn("size-3.5", n <= review.rating && "fill-current")}
                  />
                ))}
              </span>
              <time className="text-[11px] leading-4 text-muted" dateTime={review.created_at}>
                {formatCommunityPostTime(review.created_at)}
              </time>
            </div>
          </div>
          {actions}
        </div>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
          {review.comment}
        </p>
      </div>
    </div>
    {review.response ? (
      <div className="mt-4 ml-11 min-w-0 rounded-md bg-surface-muted p-3" data-testimonial-response>
        <p className="mb-2 text-xs font-semibold leading-5 text-muted">Resposta do profissional</p>
        <div className="flex items-start justify-between gap-2" data-testimonial-response-header>
          <div className="min-w-0 flex-1">
            <TestimonialProfessionalIdentity
              professional={professional}
              fallbackName={responseName}
              compact
              date={review.responded_at}
            />
          </div>
          {responseActions}
        </div>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted">
          {review.response}
        </p>
      </div>
    ) : null}
    {children}
  </article>
);

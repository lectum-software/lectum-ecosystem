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
  author: { name: string; initials?: string };
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
  <article className="min-w-0 rounded-lg bg-surface p-4" data-testimonial-card>
    {context ? <div className="mb-3 text-xs text-muted">{context}</div> : null}
    <div className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2.5 sm:grid-cols-[2.25rem_minmax(0,1fr)]">
      {review.response ? (
        <span
          aria-hidden
          data-testimonial-stem
          className="pointer-events-none absolute -bottom-3 top-10 left-4 z-0 -translate-x-[0.75px] border-l-[1.5px] border-border-strong sm:left-[1.125rem]"
        />
      ) : null}
      <div className="relative flex justify-center [&>span]:size-8 sm:[&>span]:size-9">
        {ownAuthorAvatar ? (
          <AuthorAvatar avatar={ownAuthorAvatar} name={review.author.name} />
        ) : (
          <span
            aria-hidden
            className="grid shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-black text-primary ring-2 ring-media-foreground dark:ring-background"
          >
            {review.author.initials || review.author.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 px-0.5 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="grid min-w-0 flex-1 gap-0.5">
            <h3 className="truncate text-sm font-black leading-tight">{review.author.name}</h3>
            <time
              className="text-[11px] font-semibold leading-tight text-muted"
              dateTime={review.created_at}
            >
              {formatCommunityPostTime(review.created_at)}
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
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted">
          {review.comment}
        </p>
      </div>
    </div>
    {review.response ? (
      <div className="relative z-10 mt-3 ml-4 min-w-0 pl-[18px] sm:ml-[18px] sm:pl-[22px]">
        <span
          aria-hidden
          data-testimonial-curve
          className="pointer-events-none absolute top-0 left-0 z-0 h-[12.75px] w-[18.75px] -translate-x-[0.75px] rounded-bl-[8px] border-b-[1.5px] border-l-[1.5px] border-border-strong sm:w-[22.75px]"
        />
        <TestimonialProfessionalIdentity
          professional={professional}
          fallbackName={responseName}
          compact
          date={review.responded_at}
        />
        <div className="min-w-0 pl-[34px]">
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted">
            {review.response}
          </p>
          {responseActions}
        </div>
      </div>
    ) : null}
    {children}
  </article>
);

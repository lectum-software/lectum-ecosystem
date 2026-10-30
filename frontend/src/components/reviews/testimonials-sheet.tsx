"use client";

import { useState } from "react";
import { ReviewsIcon } from "@/components/ui/reviews-icon";
import {
  TestimonialInvitationAction,
  type TestimonialInvitationOptions,
} from "./testimonial-invitation-action";
import { type TestimonialInitial, TestimonialSheetDialog } from "./testimonial-sheet-dialog";

export const TestimonialComposer = ({
  psychologistId,
  open,
  onClose,
  initial,
}: {
  psychologistId: string;
  open: boolean;
  onClose: () => void;
  initial?: TestimonialInitial;
}) =>
  open ? (
    <TestimonialSheetDialog
      key={`${psychologistId}:${initial?.id ?? "new"}`}
      psychologistId={psychologistId}
      initialView="compose"
      onClose={onClose}
      initial={initial}
    />
  ) : null;

export const TestimonialInvitation = (props: TestimonialInvitationOptions) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TestimonialInvitationAction {...props} onCompose={() => setOpen(true)} />
      <TestimonialComposer
        psychologistId={props.psychologistId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

export const TestimonialsButton = ({
  psychologistId,
  name,
  count,
  className,
  disabled,
  iconSize = 24,
  desktop = false,
  actionPadding,
}: {
  psychologistId: string;
  name: string;
  count: number;
  className?: string;
  disabled?: boolean;
  iconSize?: number;
  desktop?: boolean;
  actionPadding?: number;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        aria-label={`Abrir depoimentos de ${name}`}
        className={className || "grid min-h-11 min-w-11 justify-items-center gap-1"}
        disabled={disabled}
        style={actionPadding === undefined ? undefined : { paddingBlock: actionPadding }}
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <span
          className={
            desktop
              ? "grid h-10 w-10 place-items-center rounded-full border border-border bg-surface transition hover:scale-105 hover:bg-surface-muted active:scale-95"
              : "grid place-items-center"
          }
        >
          <ReviewsIcon aria-hidden style={{ width: iconSize, height: iconSize }} />
        </span>
        <span className={desktop ? "text-[10px] font-bold leading-4" : "text-xs leading-4"}>
          {count}
        </span>
      </button>
      {open ? (
        <TestimonialSheetDialog
          psychologistId={psychologistId}
          name={name}
          initialView="list"
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
};

"use client";

import { CircleCheck } from "lucide-react";
import { Button } from "@/registry/new-york-v4/ui/button";

type ProfileUpdateConfirmationProps = {
  displayName: string;
  onContinue: () => void;
};

export const ProfileUpdateConfirmation = ({
  displayName,
  onContinue,
}: ProfileUpdateConfirmationProps) => (
  <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10">
    <div className="grid w-full max-w-sm justify-items-center text-center">
      <div aria-live="polite" className="grid justify-items-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary">
          <CircleCheck className="h-8 w-8" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-black text-foreground">Nome atualizado</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Sua publicação será identificada como{" "}
          <strong className="font-bold text-foreground">{displayName}</strong>.
        </p>
      </div>
      <Button
        className="mt-7 h-12 w-full rounded-full text-base font-bold"
        onClick={onContinue}
        type="button"
      >
        Continuar para o post
      </Button>
    </div>
  </div>
);

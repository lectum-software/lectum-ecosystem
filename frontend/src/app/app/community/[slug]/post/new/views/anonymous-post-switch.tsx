"use client";

import { cn } from "@/lib/utils";

type AnonymousPostSwitchProps = {
  checked: boolean;
  onBlur: () => void;
  onChange: (checked: boolean) => void;
  restoreEditorFocus: () => void;
};

export const AnonymousPostSwitch = ({
  checked,
  onBlur,
  onChange,
  restoreEditorFocus,
}: AnonymousPostSwitchProps) => (
  <button
    aria-checked={checked}
    aria-label="Publicar anonimamente"
    className={cn(
      "relative h-7 w-12 shrink-0 rounded-full bg-surface-muted ring-1 ring-border transition focus:outline-none focus:ring-4 focus:ring-primary/15",
      checked && "bg-primary ring-primary/20",
    )}
    onBlur={onBlur}
    onClick={(event) => {
      onChange(!checked);
      // Keyboard/assistive clicks keep focus here; pointer clicks retain the mobile editor flow.
      if (event.detail > 0) restoreEditorFocus();
    }}
    onMouseDown={(event) => event.preventDefault()}
    role="switch"
    type="button"
  >
    <span
      className={cn(
        "absolute top-1 left-1 h-5 w-5 rounded-full bg-surface shadow-[var(--lectum-shadow-soft)] transition",
        checked && "translate-x-5",
      )}
    />
  </button>
);

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type LoadingStateProps = {
  label?: string;
  className?: string;
};

export function LoadingState({ className, label = "Carregando" }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 text-sm font-medium text-muted",
        className,
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

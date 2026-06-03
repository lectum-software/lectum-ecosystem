import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type InlineAlertProps = {
  children: ReactNode;
  className?: string;
  title?: string;
  variant?: "info" | "success" | "warning" | "error";
};

const variants = {
  info: {
    icon: Info,
    className: "border-primary/20 bg-primary-soft text-primary",
  },
  success: {
    icon: CheckCircle2,
    className: "border-success/30 bg-success/10 text-success",
  },
  warning: {
    icon: TriangleAlert,
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  error: {
    icon: TriangleAlert,
    className: "border-danger/30 bg-danger/10 text-danger",
  },
};

export function InlineAlert({ children, className, title, variant = "info" }: InlineAlertProps) {
  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-[var(--lectum-card-radius)] border px-4 py-3 text-sm",
        config.className,
        className,
      )}
      role={variant === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={cn(title && "mt-1", "leading-6")}>{children}</div>
      </div>
    </div>
  );
}

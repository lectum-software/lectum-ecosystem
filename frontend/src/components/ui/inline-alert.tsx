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
    className: "border-green-200 bg-green-50 text-green-700",
  },
  warning: {
    icon: TriangleAlert,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  error: {
    icon: TriangleAlert,
    className: "border-red-200 bg-red-50 text-red-700",
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

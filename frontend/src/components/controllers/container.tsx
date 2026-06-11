"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ContainerProps = {
  children: ReactNode;
  className?: string;
  name: string;
  label?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  skipHtmlFor?: boolean;
  tooltip?: string;
  description?: string;
};

type LabelProps = {
  children: ReactNode;
  className: string;
  htmlFor?: string;
  skipHtmlFor?: boolean;
  testId: string;
};

function Label({ children, className, htmlFor, skipHtmlFor, testId }: LabelProps) {
  if (skipHtmlFor) {
    return (
      <div className={className} data-testid={testId}>
        {children}
      </div>
    );
  }

  return (
    <label className={className} data-testid={testId} htmlFor={htmlFor}>
      {children}
    </label>
  );
}

export function Container({
  children,
  className,
  name,
  label,
  error,
  required,
  htmlFor,
  tooltip,
  description,
  skipHtmlFor,
}: ContainerProps) {
  const id = htmlFor || name;

  return (
    <Label
      className={cn("grid min-w-0 gap-2 text-sm font-semibold text-foreground", className)}
      htmlFor={htmlFor}
      skipHtmlFor={skipHtmlFor}
      testId={`input-controller-${name}`}
    >
      {label ? (
        <span className="flex items-center gap-1.5">
          <span>{label}</span>
          {required ? <span className="text-danger">*</span> : null}
          {tooltip ? (
            <span className="inline-flex text-subtle" title={tooltip}>
              <Info className="h-4 w-4" aria-hidden="true" />
            </span>
          ) : null}
        </span>
      ) : null}

      {description ? (
        <span className="-mt-1 text-xs font-normal leading-5 text-muted" id={`${id}-description`}>
          {description}
        </span>
      ) : null}

      {children}

      {/* Slot de erro com altura fixa reservada em todos os campos (com ou sem erro),
          para evitar layout shift quando a mensagem aparece/some. */}
      <span
        className="block min-h-4 text-xs font-medium leading-4 text-danger"
        id={`${id}-error`}
        role="alert"
      >
        {error}
      </span>
    </Label>
  );
}

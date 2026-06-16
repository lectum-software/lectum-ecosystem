"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PostActionSize = "sm" | "md";

export const POST_ACTION_ICON_CLASSNAME = "h-4 w-4 shrink-0";
export const POST_ACTION_TEXT_CLASSNAME =
  "min-w-[1.1ch] text-center text-[12px] font-semibold leading-none tracking-[-0.01em]";
export const POST_ACTION_COUNT_CLASSNAME = `${POST_ACTION_TEXT_CLASSNAME} tabular-nums`;

const sizeClassName = (size: PostActionSize, iconOnly = false) => {
  const base = size === "sm" ? "h-8 text-[12px]" : "h-9 text-[12px]";

  return iconOnly ? `${base} w-8 gap-0 px-0` : `${base} min-w-8 gap-1.5 px-2.5`;
};

const baseClassName =
  "inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none tracking-[-0.01em] text-muted transition-[background-color,color,transform] duration-200 hover:bg-surface-muted hover:text-foreground active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60";

type PostActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  activeClassName?: string;
  count?: number;
  icon: LucideIcon;
  iconClassName?: string;
  label: string;
  size?: PostActionSize;
};

export const PostActionButton = ({
  active,
  activeClassName = "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary",
  children,
  className,
  count,
  icon: Icon,
  iconClassName,
  label,
  size = "md",
  ...props
}: PostActionButtonProps) => {
  const iconOnly = typeof count !== "number" && !children;

  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        baseClassName,
        sizeClassName(size, iconOnly),
        className,
        active && activeClassName,
      )}
      title={label}
      type="button"
      {...props}
    >
      <Icon
        className={cn(POST_ACTION_ICON_CLASSNAME, iconClassName)}
        strokeWidth={2}
        aria-hidden="true"
      />
      {children ? <span className={POST_ACTION_TEXT_CLASSNAME}>{children}</span> : null}
      {typeof count === "number" ? (
        <span className={cn(POST_ACTION_COUNT_CLASSNAME, "transition-opacity duration-200")}>
          {count.toLocaleString("pt-BR")}
        </span>
      ) : null}
    </button>
  );
};

type PostActionLinkProps = {
  children?: ReactNode;
  className?: string;
  count?: number;
  href: string;
  icon: LucideIcon;
  label: string;
  size?: PostActionSize;
};

export const PostActionLink = ({
  children,
  className,
  count,
  href,
  icon: Icon,
  label,
  size = "md",
}: PostActionLinkProps) => {
  const iconOnly = typeof count !== "number" && !children;

  return (
    <Link
      aria-label={label}
      className={cn(baseClassName, sizeClassName(size, iconOnly), className)}
      href={href}
      title={label}
    >
      <Icon className={POST_ACTION_ICON_CLASSNAME} strokeWidth={2} aria-hidden="true" />
      {children ? <span className={POST_ACTION_TEXT_CLASSNAME}>{children}</span> : null}
      {typeof count === "number" ? (
        <span className={cn(POST_ACTION_COUNT_CLASSNAME, "transition-opacity duration-200")}>
          {count.toLocaleString("pt-BR")}
        </span>
      ) : null}
    </Link>
  );
};

type PostActionMetricProps = {
  active?: boolean;
  children?: ReactNode;
  className?: string;
  count?: number;
  icon: LucideIcon;
  iconClassName?: string;
  label: string;
  size?: PostActionSize;
};

export const PostActionMetric = ({
  active,
  children,
  className,
  count,
  icon: Icon,
  iconClassName,
  label,
  size = "md",
}: PostActionMetricProps) => {
  const iconOnly = typeof count !== "number" && !children;

  return (
    <span
      className={cn(
        baseClassName,
        "pointer-events-none",
        sizeClassName(size, iconOnly),
        active && "bg-primary-soft text-primary",
        className,
      )}
      title={label}
    >
      <Icon
        className={cn(POST_ACTION_ICON_CLASSNAME, iconClassName)}
        strokeWidth={2}
        aria-hidden="true"
      />
      {children ? <span className={POST_ACTION_TEXT_CLASSNAME}>{children}</span> : null}
      {typeof count === "number" ? (
        <span className={POST_ACTION_COUNT_CLASSNAME}>{count.toLocaleString("pt-BR")}</span>
      ) : null}
    </span>
  );
};

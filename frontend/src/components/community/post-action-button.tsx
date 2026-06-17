"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PostActionSize = "xs" | "sm" | "md";

export const POST_ACTION_ICON_CLASSNAME = "h-4 w-4 shrink-0";
export const POST_ACTION_TEXT_CLASSNAME =
  "min-w-[1.1ch] text-center text-[12px] font-semibold leading-none tracking-[-0.01em]";
export const POST_ACTION_COUNT_CLASSNAME = `${POST_ACTION_TEXT_CLASSNAME} tabular-nums`;

const sizeClassName = (size: PostActionSize, iconOnly = false) => {
  const base =
    size === "xs" ? "h-6 text-[10px]" : size === "sm" ? "h-8 text-[12px]" : "h-9 text-[12px]";

  if (size === "xs") {
    return iconOnly ? `${base} w-6 gap-0 px-0` : `${base} min-w-6 gap-0.5 px-1.5`;
  }

  return iconOnly ? `${base} w-8 gap-0 px-0` : `${base} min-w-8 gap-1.5 px-2.5`;
};

export const postActionIconClassName = (size: PostActionSize = "md") =>
  size === "xs" ? "h-3.5 w-3.5 shrink-0" : POST_ACTION_ICON_CLASSNAME;

export const postActionTextClassName = (size: PostActionSize = "md") =>
  cn(
    "min-w-[1.1ch] text-center font-semibold leading-none tracking-[-0.01em]",
    size === "xs" ? "text-[10px]" : "text-[12px]",
  );

export const postActionCountClassName = (size: PostActionSize = "md") =>
  cn(postActionTextClassName(size), "tabular-nums");

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
        className={cn(postActionIconClassName(size), iconClassName)}
        strokeWidth={2}
        aria-hidden="true"
      />
      {children ? <span className={postActionTextClassName(size)}>{children}</span> : null}
      {typeof count === "number" ? (
        <span className={cn(postActionCountClassName(size), "transition-opacity duration-200")}>
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
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    event.stopPropagation();
  };

  return (
    <Link
      aria-label={label}
      className={cn(baseClassName, sizeClassName(size, iconOnly), className)}
      href={href}
      onClick={handleClick}
      title={label}
    >
      <Icon className={postActionIconClassName(size)} strokeWidth={2} aria-hidden="true" />
      {children ? <span className={postActionTextClassName(size)}>{children}</span> : null}
      {typeof count === "number" ? (
        <span className={cn(postActionCountClassName(size), "transition-opacity duration-200")}>
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
        className={cn(postActionIconClassName(size), iconClassName)}
        strokeWidth={2}
        aria-hidden="true"
      />
      {children ? <span className={postActionTextClassName(size)}>{children}</span> : null}
      {typeof count === "number" ? (
        <span className={postActionCountClassName(size)}>{count.toLocaleString("pt-BR")}</span>
      ) : null}
    </span>
  );
};

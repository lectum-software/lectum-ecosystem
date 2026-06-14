"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PostActionSize = "sm" | "md";

const sizeClassName = (size: PostActionSize) =>
  size === "sm"
    ? "h-8 min-w-8 gap-1.5 px-2.5 text-[12px]"
    : "h-9 min-w-9 gap-1.5 px-2.5 text-[12px]";

const baseClassName =
  "inline-flex items-center justify-center rounded-full font-semibold leading-none tracking-[-0.01em] text-muted transition-[background-color,color,transform] duration-200 hover:bg-surface-muted hover:text-foreground active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60";

type PostActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
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
  className,
  count,
  icon: Icon,
  iconClassName,
  label,
  size = "md",
  ...props
}: PostActionButtonProps) => (
  <button
    aria-label={label}
    aria-pressed={active}
    className={cn(baseClassName, sizeClassName(size), className, active && activeClassName)}
    title={label}
    type="button"
    {...props}
  >
    <Icon className={cn("h-4 w-4 shrink-0", iconClassName)} strokeWidth={2} aria-hidden="true" />
    {typeof count === "number" ? (
      <span className="min-w-[1.1ch] text-center font-semibold tabular-nums leading-none transition-opacity duration-200">
        {count.toLocaleString("pt-BR")}
      </span>
    ) : null}
  </button>
);

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
}: PostActionLinkProps) => (
  <Link
    aria-label={label}
    className={cn(baseClassName, sizeClassName(size), className)}
    href={href}
    title={label}
  >
    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
    {typeof count === "number" ? (
      <span className="min-w-[1.1ch] text-center font-semibold tabular-nums leading-none transition-opacity duration-200">
        {count.toLocaleString("pt-BR")}
      </span>
    ) : null}
    {children}
  </Link>
);

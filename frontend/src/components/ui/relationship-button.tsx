"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type RelationshipButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "compact" | "hero" | "header";
};

export const RelationshipButton = ({
  className,
  size = "hero",
  style,
  ...props
}: RelationshipButtonProps) => (
  <button
    type="button"
    className={cn(
      "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-primary/45 bg-transparent font-semibold leading-none tracking-normal text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-70",
      size === "header"
        ? "h-[44px] min-w-[44px] w-auto gap-[8px] border-0 px-0 leading-[20px] shadow-none"
        : size === "hero"
          ? "h-10 w-[108px] px-3"
          : "h-5 w-[66px] px-2",
      className,
    )}
    style={{ fontSize: size === "compact" ? 11 : 13, fontWeight: 600, ...style }}
    {...props}
  />
);

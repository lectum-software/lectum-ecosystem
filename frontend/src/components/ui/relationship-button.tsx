"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type RelationshipButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "compact" | "hero";
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
      size === "hero" ? "h-10 w-[108px] px-3" : "h-5 w-[66px] px-2",
      className,
    )}
    style={{ fontSize: size === "hero" ? 13 : 11, fontWeight: 600, ...style }}
    {...props}
  />
);

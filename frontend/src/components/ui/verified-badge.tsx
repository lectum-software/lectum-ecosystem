import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

export function VerifiedBadgeIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={cn("h-5 w-5 shrink-0 text-primary", className)}
      fill="none"
      viewBox="0 0 30 28"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Perfil verificado</title>
      <path
        d="M10.3636 28L7.77273 23.7333L2.86364 22.6667L3.34091 17.7333L0 14L3.34091 10.2667L2.86364 5.33333L7.77273 4.26667L10.3636 0L15 1.93333L19.6364 0L22.2273 4.26667L27.1364 5.33333L26.6591 10.2667L30 14L26.6591 17.7333L27.1364 22.6667L22.2273 23.7333L19.6364 28L15 26.0667L10.3636 28ZM13.5682 18.7333L21.2727 11.2L19.3636 9.26667L13.5682 14.9333L10.6364 12.1333L8.72727 14L13.5682 18.7333Z"
        fill="currentColor"
      />
    </svg>
  );
}

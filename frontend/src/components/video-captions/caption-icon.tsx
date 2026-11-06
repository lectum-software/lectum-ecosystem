"use client";

import { ClosedCaption } from "lucide-react";
import { useId } from "react";

export function CaptionIcon({ active, size = 32 }: { active: boolean; size?: number }) {
  const id = useId();
  if (!active)
    return (
      <span
        aria-hidden="true"
        className="block bg-current"
        style={{
          width: size,
          height: size,
          mask: "url(/icons/close-caption.png) center / contain no-repeat",
        }}
      />
    );
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 28 28">
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect x="6" y="7" width="16" height="14" />
        </clipPath>
        <mask
          id={id}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="28"
          height="28"
          style={{ maskType: "luminance" }}
        >
          <rect x="2" y="3" width="24" height="22" rx="5" fill="white" />
          <ClosedCaption
            width="28"
            height="28"
            color="black"
            strokeWidth={2.5}
            clipPath={`url(#${id}-clip)`}
          />
        </mask>
      </defs>
      <rect width="28" height="28" fill="currentColor" mask={`url(#${id})`} />
    </svg>
  );
}

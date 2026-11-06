"use client";

export function CaptionIcon({ active, size = 32 }: { active: boolean; size?: number }) {
  return (
    <span
      aria-hidden="true"
      data-active={active}
      className="block bg-current"
      style={{
        width: size,
        height: size,
        mask: "url(/icons/close-caption.png) center / contain no-repeat",
      }}
    />
  );
}

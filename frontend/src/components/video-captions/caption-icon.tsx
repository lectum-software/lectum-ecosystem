"use client";

export function CaptionIcon({ active, size = 32 }: { active: boolean; size?: number }) {
  return (
    <span
      aria-hidden="true"
      data-active={active}
      className="relative block"
      style={{
        width: size,
        height: size,
      }}
    >
      {active && (
        <span
          data-caption-fill="true"
          className="absolute bg-media-foreground"
          style={{ inset: "20% 16%", borderRadius: "12%" }}
        />
      )}
      <span
        data-caption-outline="true"
        className="absolute inset-0 bg-current"
        style={{ mask: "url(/icons/close-caption.png) center / contain no-repeat" }}
      />
      {active && (
        <span
          data-caption-letters="true"
          className="absolute inset-0 bg-media-background"
          style={{
            mask: "url(/icons/close-caption.png) center / contain no-repeat",
            clipPath: "inset(30% 25%)",
          }}
        />
      )}
    </span>
  );
}

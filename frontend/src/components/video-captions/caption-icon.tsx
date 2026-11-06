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
          className="absolute inset-0 bg-media-foreground"
          style={{
            clipPath: "inset(20% 16% round 12%)",
            maskImage: "linear-gradient(currentColor, currentColor), url(/icons/close-caption.png)",
            maskSize: "100% 100%, contain",
            maskPosition: "center",
            maskRepeat: "no-repeat",
            maskComposite: "exclude",
          }}
        />
      )}
      <span
        data-caption-outline="true"
        className="absolute inset-0 bg-current"
        style={{
          mask: "url(/icons/close-caption.png) center / contain no-repeat",
          clipPath: active
            ? "polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, 25% 30%, 25% 70%, 75% 70%, 75% 30%, 25% 30%)"
            : undefined,
        }}
      />
    </span>
  );
}

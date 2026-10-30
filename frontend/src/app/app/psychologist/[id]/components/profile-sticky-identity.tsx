"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { fitProfileName } from "../modules/profile-name";

export const ProfileStickyIdentity = ({ name, verified }: { name: string; verified: boolean }) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const [fitted, setFitted] = useState({ source: name, text: name });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const label = nameRef.current;
    if (!container || !label) return;
    const context = document.createElement("canvas").getContext("2d");
    if (!context) return;
    let frame = 0;
    let disposed = false;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const style = getComputedStyle(label);
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const badge = verified
          ? (container.querySelector("svg")?.getBoundingClientRect().width ?? 0)
          : 0;
        const gap = badge ? Number.parseFloat(getComputedStyle(container).columnGap) || 0 : 0;
        const text = fitProfileName(
          name,
          container.clientWidth - badge - gap,
          (value) => context.measureText(value).width,
        );
        setFitted((current) =>
          current.source === name && current.text === text ? current : { source: name, text },
        );
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(container);
    update();
    void document.fonts.ready.then(() => {
      if (!disposed) update();
    });
    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [name, verified]);

  return (
    <span
      className="-ml-1 flex min-w-0 flex-1 items-center gap-0.5"
      data-profile-sticky-identity
      ref={containerRef}
    >
      <span className="sr-only">{name}</span>
      <span
        className="min-w-0 truncate text-[15px] font-semibold leading-[20px] text-foreground"
        data-profile-sticky-name
        ref={nameRef}
        aria-hidden="true"
        title={name}
      >
        {fitted.source === name ? fitted.text : name}
      </span>
      {verified ? (
        <VerifiedBadgeIcon aria-label="Perfil verificado" className="h-4 w-4 shrink-0" />
      ) : null}
    </span>
  );
};

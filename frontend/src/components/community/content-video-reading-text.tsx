"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import styles from "./content-video-viewer.module.css";

export const ReadingText = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLElement>(null);
  const [hasMore, setHasMore] = useState(false);
  const measure = useCallback(() => {
    const element = ref.current;
    if (element) setHasMore(element.scrollHeight - element.scrollTop - element.clientHeight > 4);
  }, []);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    measure();
    return () => observer.disconnect();
  }, [measure]);
  return (
    <section
      ref={ref}
      className={styles.scrollText}
      data-has-more={hasMore || undefined}
      onScroll={measure}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Scrollable reading text must be reachable by keyboard.
      tabIndex={0}
      aria-label="Texto completo"
    >
      <div>{children}</div>
    </section>
  );
};

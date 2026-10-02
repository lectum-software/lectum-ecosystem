"use client";

const MODAL_LAYER_SELECTOR =
  '[aria-modal="true"], [role="dialog"][data-create-post-sheet-state="open"]';

export const hasVisibleModalLayer = () => {
  if (typeof document === "undefined") return false;

  return Array.from(document.querySelectorAll<HTMLElement>(MODAL_LAYER_SELECTOR)).some(
    (element) => {
      const rect = element.getBoundingClientRect();
      const styles = window.getComputedStyle(element);

      return (
        rect.width > 0 &&
        rect.height > 0 &&
        styles.display !== "none" &&
        styles.visibility !== "hidden" &&
        Number(styles.opacity) !== 0
      );
    },
  );
};

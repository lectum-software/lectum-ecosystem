"use client";

import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { getReplyMenuPosition } from "@/utils/reply-menu-position";

export const ReplyMenuSurface = ({
  children,
  triggerRef,
  onClose,
  width = 256,
}: {
  children: ReactNode;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  width?: number;
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const [portalHost, setPortalHost] = useState<Element | null>(null);
  useLayoutEffect(() => {
    setPortalHost(triggerRef.current?.closest("dialog") ?? document.body);
  }, [triggerRef]);
  const [position, setPosition] = useState<CSSProperties>({ visibility: "hidden", width });
  useLayoutEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useLayoutEffect(() => {
    if (!portalHost) return;
    const menu = menuRef.current;
    const trigger = triggerRef.current;
    if (!menu || !trigger) return;
    const update = () => {
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0;
      const left = viewport?.offsetLeft ?? 0;
      let bottom = top + (viewport?.height ?? window.innerHeight);
      const right = left + (viewport?.width ?? window.innerWidth);
      for (const footer of document.querySelectorAll<HTMLElement>(
        '[data-fixed-bottom-recovery="true"]',
      )) {
        if (getComputedStyle(footer).position !== "fixed") continue;
        const rect = footer.getBoundingClientRect();
        if (rect.bottom > top && rect.top < bottom && rect.right > left && rect.left < right) {
          bottom = Math.min(bottom, rect.top);
        }
      }
      setPosition(
        getReplyMenuPosition(
          trigger.getBoundingClientRect(),
          { top, left, bottom, right },
          width,
          menu.scrollHeight + 2,
        ),
      );
    };
    update();
    const initialFocus = window.requestAnimationFrame(() => {
      menu
        .querySelector<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)')
        ?.focus({ preventScroll: true });
    });
    const observer = new ResizeObserver(update);
    observer.observe(menu);
    for (const footer of document.querySelectorAll('[data-fixed-bottom-recovery="true"]'))
      observer.observe(footer);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        trigger.focus({ preventScroll: true });
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const items = Array.from(
        menu.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)'),
      );
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : (index + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
      items[next]?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.cancelAnimationFrame(initialFocus);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [portalHost, triggerRef, width]);

  if (!portalHost) return null;
  return createPortal(
    <div className="fixed inset-0 z-[900]" data-comment-collapse-ignore="true">
      <button
        aria-label="Fechar menu de ações"
        className="absolute inset-0 h-full w-full cursor-default bg-transparent"
        tabIndex={-1}
        type="button"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
          triggerRef.current?.focus({ preventScroll: true });
        }}
      />
      <div
        aria-label="Ações da resposta"
        className="fixed overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface p-1.5 text-sm shadow-[var(--lectum-shadow)]"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        ref={menuRef}
        role="menu"
        style={position}
      >
        {children}
      </div>
    </div>,
    portalHost,
  );
};

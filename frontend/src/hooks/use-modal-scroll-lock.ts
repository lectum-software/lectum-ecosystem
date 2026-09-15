"use client";

import { useLayoutEffect } from "react";

// Each acquisition owns one release, including StrictMode and out-of-order cleanup.
export const createModalScrollLock = (lock: () => () => void) => {
  const owners = new Set<symbol>();
  let restore: (() => void) | undefined;

  return () => {
    const owner = Symbol();
    if (owners.size === 0) restore = lock();
    owners.add(owner);

    return () => {
      if (!owners.delete(owner) || owners.size > 0) return;
      const release = restore;
      restore = undefined;
      release?.();
    };
  };
};

const locks = new WeakMap<Document, ReturnType<typeof createModalScrollLock>>();
const overflowProperties = new Set(["overflow", "overflow-x", "overflow-y"]);

const lockDocumentScroll = (document: Document) => {
  const snapshots = [document.documentElement.style, document.body.style].map((style) => ({
    style,
    // Preserve declarations, priorities and shorthand/longhand order, not all inline styles.
    declarations: Array.from(style)
      .filter((property) => overflowProperties.has(property))
      .map((property) => ({
        property,
        value: style.getPropertyValue(property),
        priority: style.getPropertyPriority(property),
      })),
  }));
  for (const { style } of snapshots) style.setProperty("overflow", "hidden");

  return () => {
    for (const { style, declarations } of snapshots) {
      for (const property of overflowProperties) style.removeProperty(property);
      for (const { property, value, priority } of declarations) {
        style.setProperty(property, value, priority);
      }
    }
  };
};

export const useModalScrollLock = (open: boolean) => {
  useLayoutEffect(() => {
    if (!open) return;
    let acquire = locks.get(document);
    if (!acquire) {
      acquire = createModalScrollLock(() => lockDocumentScroll(document));
      locks.set(document, acquire);
    }
    return acquire();
  }, [open]);
};

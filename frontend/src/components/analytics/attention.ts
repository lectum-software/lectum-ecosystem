"use client";

export const documentHasUserAttention = () => {
  if (typeof document === "undefined") return false;
  if (document.visibilityState !== "visible") return false;

  return typeof document.hasFocus !== "function" || document.hasFocus();
};

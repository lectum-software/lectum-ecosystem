"use client";

import { useEffect, useRef, useState } from "react";
import type { ExpenseCreation } from "@/api/req/finance/expenses";
import { expenseStorageKey, readExpenseCreation } from "./expense-policy";

type Loaded = { key: string; ready: boolean; request: ExpenseCreation | null };
export const scopedExpenseRecovery = (key: string | null, loaded: Loaded | null) =>
  key && loaded?.key === key
    ? { ready: loaded.ready, request: loaded.request }
    : { ready: false, request: null };
export const useExpenseRecovery = (actorId: string | null | undefined) => {
  const key = expenseStorageKey(actorId);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const requestRef = useRef<Loaded | null>(null);
  const state = scopedExpenseRecovery(key, loaded);
  useEffect(() => {
    if (!key) return;
    let active = true;
    const frame = window.requestAnimationFrame(() => {
      if (!active) return;
      let next: ReturnType<typeof readExpenseCreation>;
      try {
        next = readExpenseCreation(window.sessionStorage.getItem(key));
      } catch {
        next = { ready: false, request: null };
      }
      requestRef.current = { key, ...next };
      setLoaded({ key, ...next });
    });
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, [key]);
  const preserve = (request: ExpenseCreation | null) => {
    if (!key) throw new Error("EXPENSE_RECOVERY_UNAVAILABLE");
    if (request) window.sessionStorage.setItem(key, JSON.stringify(request));
    else window.sessionStorage.removeItem(key);
    requestRef.current = { key, request, ready: true };
    setLoaded((current) => (current?.key === key ? { key, request, ready: true } : current));
  };
  const block = () =>
    setLoaded((current) => (current?.key === key ? { ...current, ready: false } : current));
  const hasRequest = () =>
    state.request !== null ||
    Boolean(requestRef.current?.key === key && requestRef.current.request);
  return { ...state, preserve, block, hasRequest };
};

"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { Provider as ReduxProvider } from "react-redux";

import { store } from "@/store";

const LEGACY_PERSISTED_USER_KEY = "persist:lectum";

export const Provider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_PERSISTED_USER_KEY);
    } catch {
      // Storage bloqueado não deve impedir a inicialização da aplicação.
    }
  }, []);

  return <ReduxProvider store={store}>{children}</ReduxProvider>;
};

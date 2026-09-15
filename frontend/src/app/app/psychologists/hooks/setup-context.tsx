"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { PsychologistsSetup } from "./use-psychologists-setup";

const PsychologistsSetupContext = createContext<PsychologistsSetup | null>(null);

export const PsychologistsSetupProvider = ({
  children,
  value,
}: {
  children: ReactNode;
  value: PsychologistsSetup;
}) => (
  <PsychologistsSetupContext.Provider value={value}>{children}</PsychologistsSetupContext.Provider>
);

export const usePsychologistsSetupContext = () => {
  const value = useContext(PsychologistsSetupContext);

  if (!value) {
    throw new Error("PsychologistsSetupProvider ausente na árvore da busca de psicólogos.");
  }

  return value;
};

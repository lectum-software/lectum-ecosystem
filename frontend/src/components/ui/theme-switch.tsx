"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const subscribeToClientMount = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeSwitch() {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToClientMount,
    getClientSnapshot,
    getServerSnapshot,
  );

  const enabled = mounted && (theme === "dark" || resolvedTheme === "dark");

  return (
    <button
      aria-checked={enabled}
      aria-label={enabled ? "Desativar modo escuro" : "Ativar modo escuro"}
      className={cn(
        "inline-flex h-8 w-14 items-center rounded-full border border-border bg-surface-muted p-1 transition focus:outline-none focus:ring-4 focus:ring-primary/10",
        enabled && "border-primary/40 bg-primary",
      )}
      onClick={() => setTheme(enabled ? "light" : "dark")}
      role="switch"
      type="button"
    >
      <span
        className={cn(
          "grid h-6 w-6 place-items-center rounded-full bg-surface text-muted shadow-sm transition",
          enabled && "translate-x-6 text-primary",
        )}
      >
        {enabled ? (
          <Moon className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Sun className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </span>
    </button>
  );
}

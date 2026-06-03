"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Tema claro", Icon: Sun },
  { value: "dark", label: "Tema escuro", Icon: Moon },
  { value: "system", label: "Tema do sistema", Icon: Monitor },
] as const;

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes só resolve o tema no client; aguardamos a montagem para não
  // divergir o destaque do ativo entre server e client (hydration). Padrão
  // idiomático do next-themes — o setState de montagem aqui é intencional.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;

        return (
          <button
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full text-muted transition hover:text-primary",
              active && "bg-primary-soft text-primary",
            )}
            key={value}
            onClick={() => setTheme(value)}
            title={label}
            type="button"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

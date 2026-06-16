import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";

type SecondaryPageHeaderProps = {
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
  title: string;
};

export const SecondaryPageHeader = ({
  action,
  backHref,
  backLabel = "Voltar",
  className,
  title,
}: SecondaryPageHeaderProps) => (
  <header className={cn("flex items-center justify-between gap-3", className)}>
    <div className="flex min-w-0 items-center gap-3">
      {backHref ? (
        <Button
          asChild
          className="h-11 w-11 shrink-0 rounded-full p-0 text-muted transition hover:text-foreground"
          variant="ghost"
        >
          <Link aria-label={backLabel} href={backHref}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
      ) : null}

      <h1 className="min-w-0 text-2xl font-extrabold leading-tight tracking-tight text-foreground">
        {title}
      </h1>
    </div>

    {action ? <div className="flex shrink-0 items-center">{action}</div> : null}
  </header>
);

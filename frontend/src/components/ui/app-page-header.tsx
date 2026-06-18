import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type AppPageHeaderProps = {
  backHref?: string;
  backLabel?: string;
  className?: string;
  title: string;
};

export const AppPageHeader = ({
  backHref = "/app/profile",
  backLabel = "Voltar",
  className,
  title,
}: AppPageHeaderProps) => (
  <header
    className={cn(
      "grid h-14 grid-cols-[44px_1fr_44px] items-center rounded-[var(--lectum-card-radius)] border border-border bg-surface px-2 shadow-[var(--lectum-shadow-soft)]",
      className,
    )}
  >
    <Link
      aria-label={backLabel}
      className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary transition hover:bg-primary-soft/80"
      href={backHref}
    >
      <ArrowLeft className="h-5 w-5" aria-hidden />
    </Link>
    <h1 className="min-w-0 text-center text-base font-extrabold tracking-[-0.02em] text-foreground">
      {title}
    </h1>
    <span aria-hidden />
  </header>
);

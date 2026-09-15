"use client";

import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { WhatsAppIcon } from "@/components/admin-icons";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import { renderableImageSrc } from "@/lib/admin-media";
import { cn } from "@/lib/utils";
import { CARD } from "../support/config";
import { initials, isPublicAdminMediaSrc } from "../support/media";

export const CardShell = ({ children, className }: { children: ReactNode; className?: string }) => (
  <section className={cn(CARD, className)}>{children}</section>
);

export const Badge = ({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black",
      className,
    )}
    title={title}
  >
    {children}
  </span>
);

export const Avatar = ({ name, src }: { name: string; src: string | null }) => {
  const imageSrc = renderableImageSrc(src);

  if (!imageSrc) {
    return (
      <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-primary-soft text-2xl font-extrabold text-primary md:h-28 md:w-28">
        {initials(name)}
      </span>
    );
  }

  return (
    <Image
      alt={`Foto de ${name}`}
      className="h-24 w-24 shrink-0 rounded-full object-cover md:h-28 md:w-28"
      height={112}
      priority
      src={imageSrc}
      unoptimized={isPublicAdminMediaSrc(imageSrc)}
      width={112}
    />
  );
};

export const IconCircle = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-primary-soft text-primary ring-1 ring-primary/10">
    <Icon aria-hidden className="h-5 w-5" />
  </span>
);

export const MetricIconCircle = ({
  icon: Icon,
  metricId,
}: {
  icon: LucideIcon;
  metricId: string;
}) => (
  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-primary-soft text-primary ring-1 ring-primary/10">
    {metricId === "whatsapp_clicks" ? (
      <WhatsAppIcon aria-hidden className="h-5 w-5" />
    ) : (
      <Icon aria-hidden className="h-5 w-5" />
    )}
  </span>
);

export const LoadingState = () => (
  <div className="space-y-5" data-psychologist-detail-loading="true">
    <div className={cn(CARD, "h-48 animate-pulse bg-surface-muted")} />
    <div className="grid gap-5 xl:grid-cols-2">
      <div className={cn(CARD, "h-80 animate-pulse bg-surface-muted")} />
      <div className={cn(CARD, "h-80 animate-pulse bg-surface-muted")} />
    </div>
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <AdminQueryErrorState
    message={message}
    onRetry={onRetry}
    title="Não foi possível carregar o psicólogo"
  />
);

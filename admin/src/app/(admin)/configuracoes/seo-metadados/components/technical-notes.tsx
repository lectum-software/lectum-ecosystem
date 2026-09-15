"use client";

import { CheckCircle2 } from "lucide-react";
import type { AdminSeoMetadataSetting } from "@/api/req/settings";
import { cn } from "@/lib/utils";
import { cardClass, formatDateTime, robotsLabel } from "../modules/seo-support";

export const TechnicalNotes = ({ setting }: { setting?: AdminSeoMetadataSetting }) => (
  <section className={cn(cardClass, "p-4 md:p-5")}>
    <div className="mb-4 flex items-center gap-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <CheckCircle2 className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-lg font-bold text-foreground">Publicação</h2>
        <p className="text-sm text-muted">Configuração publicada e disponível para o site.</p>
      </div>
    </div>
    <dl className="space-y-3 text-sm">
      <div className="rounded-2xl bg-surface-muted/60 p-3">
        <dt className="font-bold text-foreground">Última atualização</dt>
        <dd className="mt-1 text-muted">{formatDateTime(setting?.updated_at)}</dd>
      </div>
      <div className="rounded-2xl bg-surface-muted/60 p-3">
        <dt className="font-bold text-foreground">Rota</dt>
        <dd className="mt-1 text-muted">{setting?.route_path || "Fallback global"}</dd>
      </div>
      <div className="rounded-2xl bg-surface-muted/60 p-3">
        <dt className="font-bold text-foreground">Robots</dt>
        <dd className="mt-1 text-muted">{robotsLabel(setting)}</dd>
      </div>
    </dl>
  </section>
);

import type { ReactNode } from "react";
import type { AdminCommunityContentItem } from "@/api/req/communities";
import { cn } from "@/lib/utils";

export const StatusBadge = ({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "danger" | "green" | "muted";
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black",
      tone === "green" && "bg-success/10 text-success",
      tone === "danger" && "bg-danger/10 text-danger",
      tone === "muted" && "bg-surface-muted text-muted",
    )}
  >
    {children}
  </span>
);

export const adminContentDetailHref = (
  slug: string,
  item: Pick<AdminCommunityContentItem, "content_id" | "type">,
) =>
  `/comunidades/${encodeURIComponent(slug)}/conteudo/${encodeURIComponent(
    item.type,
  )}/${encodeURIComponent(item.content_id)}`;

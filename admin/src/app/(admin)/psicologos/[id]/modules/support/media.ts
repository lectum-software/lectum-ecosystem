import type { AdminPsychologistPublicationItem } from "@/api/req/psychologists";
import { isAdminPublicMediaUrl } from "@/lib/admin-media";

export const publicationAdminDetailHref = (item: AdminPsychologistPublicationItem) =>
  `/comunidades/${encodeURIComponent(item.community.slug)}/conteudo/${encodeURIComponent(
    item.type,
  )}/${encodeURIComponent(item.id)}`;

export const isPublicAdminMediaSrc = (src: string) => isAdminPublicMediaUrl(src);

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "PS";

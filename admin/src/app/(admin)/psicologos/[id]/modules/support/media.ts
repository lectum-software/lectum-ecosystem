import type { AdminPsychologistPublicationItem } from "@/api/req/psychologists";
import { isPublicMediaPath } from "@/lib/admin-media";
import { adminApiUrl } from "@/lib/api-url";

export const publicationAdminDetailHref = (item: AdminPsychologistPublicationItem) =>
  `/comunidades/${encodeURIComponent(item.community.slug)}/conteudo/${encodeURIComponent(
    item.type,
  )}/${encodeURIComponent(item.id)}`;

export const isPublicAdminMediaSrc = (src: string) => {
  try {
    return isPublicMediaPath(new URL(src, adminApiUrl).pathname);
  } catch {
    return false;
  }
};

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "PS";

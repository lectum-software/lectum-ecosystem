import { normalizeProfessionalDisplayName } from "./professional-name";

type CommunityAuthorIdentity = {
  name: string;
  role?: null | string;
};

export const formatCommunityRelativeTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "agora";

  const diffInSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  const minutes = Math.floor(diffInSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  if (hours < 24) return `há ${hours} h`;
  if (days < 7) return `há ${days} d`;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
};

export const formatCommunityPostTime = (createdAt: string, editedAt?: string | null) => {
  const relativeTime = formatCommunityRelativeTime(createdAt);
  return editedAt ? `${relativeTime} · editado` : relativeTime;
};

export const getCommunityInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const getCommunityAuthorDisplayName = (author: CommunityAuthorIdentity) =>
  author.role === "psicologo"
    ? normalizeProfessionalDisplayName(author.name) || author.name
    : author.name;

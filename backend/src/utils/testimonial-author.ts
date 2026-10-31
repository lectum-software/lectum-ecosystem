// Only the identity shown with a review belongs in its public author contract.
export const toTestimonialAuthor = (author: { name: string; avatar?: string | null }) => {
  const parts = author.name.trim().split(/\s+/).filter(Boolean);
  const name = parts.join(" ") || "Paciente";
  const initials =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  return { name, initials, avatar: author.avatar ?? null };
};

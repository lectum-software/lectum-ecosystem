import { createHmac } from "node:crypto";

/** Pseudônimo de exibição; nunca é credencial nem substitui a autoria persistida. */
export const anonymousIdentityForAuthor = (authorId: string) => {
  const key = process.env.JWT_SECRET_KEY?.trim();
  if (!key) return { id: "anonymous:unavailable", name: "Membro Anônimo" };

  const digest = createHmac("sha256", key)
    .update("lectum:anonymous-author:v1\0")
    .update(authorId)
    .digest();

  return {
    id: `anonymous:${digest.toString("hex").slice(0, 32)}`,
    name: `Membro Anônimo #${1000 + (digest.readUInt32BE(0) % 9000)}`,
  };
};

export const anonymousDisplayNameForAuthor = (authorId: string) =>
  anonymousIdentityForAuthor(authorId).name;

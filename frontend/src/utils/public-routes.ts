export const PUBLIC_PSYCHOLOGISTS_HREF = "/psicologos";
export const PUBLIC_COMMUNITIES_HREF = "/comunidades";
export const PUBLIC_TOP_MENTORS_HREF = "/comunidades/top-mentores";

export const publicPsychologistHref = (id: string) => `${PUBLIC_PSYCHOLOGISTS_HREF}/${id}`;

export const publicPsychologistContactHref = (id: string) =>
  `${publicPsychologistHref(id)}/contato`;

export const publicCommunityHref = (slug: string) => `${PUBLIC_COMMUNITIES_HREF}/${slug}`;

export const publicCommunityPostHref = (slug: string, id: string) =>
  `${publicCommunityHref(slug)}/publicacao/${id}`;

export const publicCommunityPostWhatsappShareHref = (slug: string, id: string) =>
  `${publicCommunityPostHref(slug, id)}/whatsapp`;

export const publicCommunityReplyThreadHref = (slug: string, id: string, replyId: string) =>
  `${publicCommunityPostHref(slug, id)}/resposta/${replyId}`;

export const publicCommunityReplyWhatsappShareHref = (slug: string, id: string, replyId: string) =>
  `${publicCommunityReplyThreadHref(slug, id, replyId)}/whatsapp`;

export const legacyPublicPsychologistHref = (id: string) => `/psychologists/${id}`;
export const legacyPublicCommunityHref = (slug: string) => `/community/${slug}`;
export const legacyPublicCommunityPostHref = (slug: string, id: string) =>
  `${legacyPublicCommunityHref(slug)}/post/${id}`;
export const legacyPublicCommunityReplyThreadHref = (slug: string, id: string, replyId: string) =>
  `${legacyPublicCommunityPostHref(slug, id)}/thread/${replyId}`;

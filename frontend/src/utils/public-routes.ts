export const PUBLIC_PSYCHOLOGISTS_HREF = "/psicologos";
export const PUBLIC_COMMUNITIES_HREF = "/comunidades";
export const PUBLIC_TOP_MENTORS_HREF = "/comunidades/top-mentores";

export const publicPsychologistHref = (id: string) => `${PUBLIC_PSYCHOLOGISTS_HREF}/${id}`;

export const publicPsychologistContactHref = (id: string) =>
  `${publicPsychologistHref(id)}/contato`;

export const publicCommunityHref = (slug: string) => `${PUBLIC_COMMUNITIES_HREF}/${slug}`;

const versionQuery = (version?: string | null) =>
  version ? `?v=${encodeURIComponent(version)}` : "";

export const publicPsychologistOpenGraphImageHref = (id: string, version?: string | null) =>
  `/api/og/psicologos/${encodeURIComponent(id)}${versionQuery(version)}`;

export const publicCommunityOpenGraphImageHref = (slug: string, version?: string | null) =>
  `/api/og/comunidades/${encodeURIComponent(slug)}${versionQuery(version)}`;

export const publicCommunityPostHref = (slug: string, id: string) =>
  `${publicCommunityHref(slug)}/publicacao/${id}`;

export const publicCommunityPostFocusedReplyHref = (slug: string, id: string, replyId: string) =>
  `${publicCommunityPostHref(slug, id)}?focusReplyId=${encodeURIComponent(replyId)}#reply-${replyId}`;

const PUBLIC_REPLY_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export const normalizePublicCommunityFocusReplyId = (value?: string | string[]) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const replyId = raw?.trim();

  return replyId && PUBLIC_REPLY_ID_PATTERN.test(replyId) ? replyId : undefined;
};

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

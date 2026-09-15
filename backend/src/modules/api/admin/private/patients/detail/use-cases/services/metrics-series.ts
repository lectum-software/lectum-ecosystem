import { isVerifiedProfessionalEntitlement } from "@/utils/subscription-entitlement";
import type {
  AdminPatientDetailMetric,
  AdminPatientDetailSeriesPoint,
} from "../../DTOs/IAdminPatientDetailDTO";
import type { AdminPatientEngagementBundle } from "../../repositories/AdminPatientDetailRepository";

import { type EngagementCounts, metric, TIMEZONE } from "./intent";

export const normalizeName = (name: string) => name.replace(/\s+/g, " ").trim() || "Paciente";

export const snippet = (text: string | null | undefined, fallback: string) => {
  const normalized = text?.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;

  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
};

export const postUrl = (post: { community: { slug: string }; id: string }) =>
  `/comunidades/${post.community.slug}/publicacao/${post.id}`;

export const replyUrl = (reply: {
  id: string;
  post: { community: { slug: string }; id: string };
}) => `/comunidades/${reply.post.community.slug}/publicacao/${reply.post.id}/resposta/${reply.id}`;

export const voteTargetUrl = (vote: AdminPatientEngagementBundle["votesMade"][number]) => {
  if (vote.reply) return replyUrl(vote.reply);
  if (vote.post) return postUrl(vote.post);

  return null;
};

export const voteTargetTitle = (vote: AdminPatientEngagementBundle["votesMade"][number]) => {
  if (vote.reply) return vote.reply.post.title;
  if (vote.post) return vote.post.title;

  return "conteúdo";
};

export const isVerifiedPsychologistResponse = (
  reply: AdminPatientEngagementBundle["responsesReceived"][number],
) =>
  reply.author.role === "psicologo" &&
  isVerifiedProfessionalEntitlement(reply.author.psychologist_profile);

export const countsFromBundle = (bundle: AdminPatientEngagementBundle): EngagementCounts => ({
  comments_created: bundle.replies.length,
  downvotes_received: bundle.votesReceived.filter((vote) => vote.value < 0).length,
  posts_created: bundle.posts.length,
  reports_received: bundle.reportsReceived.length,
  saves_received: bundle.postSavesReceived.length + bundle.replySavesReceived.length,
  shares_received: bundle.sharesReceived.length,
  verified_psychologist_responses: bundle.responsesReceived.filter(isVerifiedPsychologistResponse)
    .length,
  upvotes_received: bundle.votesReceived.filter((vote) => vote.value > 0).length,
});

export const buildMetrics = (
  current: EngagementCounts,
  previous: EngagementCounts,
): AdminPatientDetailMetric[] => [
  metric({
    current: current.posts_created,
    description: "Posts feitos pelo paciente no período.",
    id: "posts_created",
    label: "Posts feitos",
    previous: previous.posts_created,
    source: "community_post.author_id",
  }),
  metric({
    current: current.comments_created,
    description: "Comentários e respostas criados pelo paciente no período.",
    id: "comments_created",
    label: "Comentários feitos",
    previous: previous.comments_created,
    source: "post_reply.author_id",
  }),
  metric({
    current: current.verified_psychologist_responses,
    description: "Respostas de psicólogos verificados em posts ou comentários do paciente.",
    id: "verified_psychologist_responses",
    label: "Respostas de psicólogos verificados",
    previous: previous.verified_psychologist_responses,
    source: "post_reply.author com psicólogo verificado",
  }),
  metric({
    current: current.reports_received,
    description: "Denúncias recebidas em posts ou comentários do paciente.",
    id: "reports_received",
    label: "Denúncias (recebidas)",
    previous: previous.reports_received,
    source: "post_report em conteúdo do paciente",
  }),
  metric({
    current: current.upvotes_received,
    description: "Votos positivos recebidos em posts e respostas do paciente.",
    id: "upvotes_received",
    label: "Upvotes (recebidos)",
    previous: previous.upvotes_received,
    source: "post_vote.value>0 em conteúdo do paciente",
  }),
  metric({
    current: current.downvotes_received,
    description: "Votos negativos recebidos em posts e respostas do paciente.",
    id: "downvotes_received",
    label: "Downvotes (recebidos)",
    previous: previous.downvotes_received,
    source: "post_vote.value<0 em conteúdo do paciente",
  }),
  metric({
    current: current.saves_received,
    description: "Salvamentos recebidos em posts e respostas do paciente.",
    id: "saves_received",
    label: "Salvamentos (recebidos)",
    previous: previous.saves_received,
    source: "post_save+post_reply_save em conteúdo do paciente",
  }),
  metric({
    current: current.shares_received,
    description: "Compartilhamentos recebidos em posts e respostas do paciente.",
    id: "shares_received",
    label: "Compartilhamentos (recebidos)",
    previous: previous.shares_received,
    source: "post_share em conteúdo do paciente",
  }),
];

export const dateKeyInTimeZone = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: TIMEZONE,
    year: "numeric",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
};

export const buildSeries = (
  labels: string[],
  bundle: AdminPatientEngagementBundle,
): AdminPatientDetailSeriesPoint[] => {
  const emptyPoint = (date: string): AdminPatientDetailSeriesPoint => ({
    comments_created: 0,
    date,
    downvotes_received: 0,
    posts_created: 0,
    reports_received: 0,
    saves_received: 0,
    shares_received: 0,
    verified_psychologist_responses: 0,
    upvotes_received: 0,
  });
  const points = new Map(labels.map((label) => [label, emptyPoint(label)]));
  const increment = (date: Date, key: keyof Omit<AdminPatientDetailSeriesPoint, "date">) => {
    const dateKey = dateKeyInTimeZone(date);
    const point = points.get(dateKey);
    if (!point) return;
    point[key] += 1;
  };

  for (const post of bundle.posts) increment(post.createdAt, "posts_created");
  for (const reply of bundle.replies) increment(reply.createdAt, "comments_created");
  for (const vote of bundle.votesReceived) {
    if (vote.value > 0) increment(vote.createdAt, "upvotes_received");
    if (vote.value < 0) increment(vote.createdAt, "downvotes_received");
  }
  for (const reply of bundle.responsesReceived.filter(isVerifiedPsychologistResponse)) {
    increment(reply.createdAt, "verified_psychologist_responses");
  }
  for (const save of bundle.postSavesReceived) increment(save.createdAt, "saves_received");
  for (const save of bundle.replySavesReceived) increment(save.createdAt, "saves_received");
  for (const share of bundle.sharesReceived) increment(share.createdAt, "shares_received");
  for (const report of bundle.reportsReceived) increment(report.createdAt, "reports_received");

  return labels.map((label) => points.get(label) ?? emptyPoint(label));
};

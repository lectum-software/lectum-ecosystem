import type { AdminPatientActivityItem } from "../../DTOs/IAdminPatientActivitiesDTO";
import { AdminPatientActivitiesRepository } from "../../repositories/AdminPatientActivitiesRepository";

import {
  activityMatchesPeriod,
  actorFromAdmin,
  actorFromUser,
  adminLogDescription,
  adminLogType,
  excerpt,
  makeActivity,
  postUrl,
  profileEvents,
  replyUrl,
  voteTargetTitle,
  voteTargetUrl,
} from "./activity-support";

export type ActivityPeriod = { end: Date | null; start: Date | null };

export const buildAdminPatientActivityItems = async ({
  id,
  period,
  repository = new AdminPatientActivitiesRepository(),
}: {
  id: string;
  period?: ActivityPeriod;
  repository?: AdminPatientActivitiesRepository;
}) => {
  const currentPeriod = period ?? { end: null, start: null };
  const patient = await repository.findPatient(id);
  if (!patient) return null;

  const targetIds = Array.from(
    new Set([patient.id, patient.patient_profile?.id].filter(Boolean) as string[]),
  );
  const [posts, replies, votes, postSaves, replySaves, memberships, reviews, adminLogs] =
    await Promise.all([
      repository.listAuthoredPosts(patient.id, currentPeriod.start, currentPeriod.end),
      repository.listAuthoredReplies(patient.id, currentPeriod.start, currentPeriod.end),
      repository.listVotesMade(patient.id, currentPeriod.start, currentPeriod.end),
      repository.listPostSaves(patient.id, currentPeriod.start, currentPeriod.end),
      repository.listReplySaves(patient.id, currentPeriod.start, currentPeriod.end),
      repository.listMemberships(patient.id, currentPeriod.start, currentPeriod.end),
      repository.listReviews(patient.id, currentPeriod.start, currentPeriod.end),
      repository.listAdminActivityLogs(targetIds, currentPeriod.start, currentPeriod.end),
    ]);

  const patientActor = actorFromUser(patient);
  const activities: AdminPatientActivityItem[] = [
    ...profileEvents(patient),
    ...posts.map((post) =>
      makeActivity({
        actor: patientActor,
        area: "comunidade",
        description: `Criou o post "${post.title}" na comunidade ${post.community.name}: ${excerpt(
          post.content,
        )}.`,
        detail_url: postUrl(post),
        id: `post-${post.id}`,
        occurred_at: post.createdAt,
        source: "community_post.author_id",
        type: "post_created",
      }),
    ),
    ...replies.map((reply) =>
      makeActivity({
        actor: patientActor,
        area: "comunidade",
        description: `Comentou em "${reply.post.title}" na comunidade ${reply.post.community.name}: ${excerpt(
          reply.content,
        )}.`,
        detail_url: replyUrl(reply),
        id: `reply-${reply.id}`,
        occurred_at: reply.createdAt,
        source: "post_reply.author_id",
        type: "reply_created",
      }),
    ),
    ...votes.map((vote) =>
      makeActivity({
        actor: patientActor,
        area: "comunidade",
        description: `Registrou ${vote.value > 0 ? "upvote" : "downvote"} em "${voteTargetTitle(
          vote,
        )}".`,
        detail_url: voteTargetUrl(vote),
        id: `vote-${vote.id}`,
        occurred_at: vote.createdAt,
        source: "post_vote.user_id",
        type: "vote_cast",
      }),
    ),
    ...postSaves.map((save) =>
      makeActivity({
        actor: patientActor,
        area: "comunidade",
        description: `Salvou o post "${save.post.title}" da comunidade ${save.post.community.name}.`,
        detail_url: postUrl(save.post),
        id: `post-save-${save.id}`,
        occurred_at: save.createdAt,
        source: "post_save.user_id",
        type: "post_saved",
      }),
    ),
    ...replySaves.map((save) =>
      makeActivity({
        actor: patientActor,
        area: "comunidade",
        description: `Salvou uma resposta em "${save.reply.post.title}" da comunidade ${save.reply.post.community.name}.`,
        detail_url: replyUrl(save.reply),
        id: `reply-save-${save.id}`,
        occurred_at: save.createdAt,
        source: "post_reply_save.user_id",
        type: "reply_saved",
      }),
    ),
    ...memberships.map((member) =>
      makeActivity({
        actor: patientActor,
        area: "comunidade",
        description: `Entrou na comunidade ${member.community.name}.`,
        detail_url: `/comunidades/${member.community.slug}`,
        id: `member-${member.id}`,
        occurred_at: member.createdAt,
        source: "community_member.user_id",
        type: "community_joined",
      }),
    ),
    ...reviews.map((review) =>
      makeActivity({
        actor: patientActor,
        area: "avaliacoes",
        description: `Criou avaliação profissional com nota ${review.rating} para ${review.psychologist.name}.`,
        detail_url: `/psicologos/${review.psychologist.id}?tab=avaliacoes`,
        id: `review-${review.id}`,
        occurred_at: review.createdAt,
        source: "professional_review.author_id",
        type: "review_created",
      }),
    ),
    ...adminLogs.flatMap((log) => {
      const type = adminLogType(log.action);
      if (!type) return [];

      return [
        makeActivity({
          actor: actorFromAdmin(log.admin),
          area: log.action.startsWith("patient_account_") ? "conta" : "perfil",
          description: adminLogDescription(log),
          id: `admin-activity-${log.id}`,
          occurred_at: log.createdAt,
          source: "admin_activity_log",
          type,
        }),
      ];
    }),
  ]
    .filter((item) => activityMatchesPeriod(item, currentPeriod))
    .sort((left, right) => right.occurred_at.getTime() - left.occurred_at.getTime());

  return { activities, patient };
};

import type { AdminPsychologistActivityItem } from "../../DTOs/IAdminPsychologistActivitiesDTO";
import { AdminPsychologistActivitiesRepository } from "../../repositories/AdminPsychologistActivitiesRepository";

import {
  type ActivityPeriod,
  activityMatchesPeriod,
  actorFromAdmin,
  actorFromUser,
  adminLogDescription,
  adminLogType,
  excerpt,
  makeActivity,
  postUrl,
  profileEvents,
  reasonLabel,
  replyUrl,
  reportContent,
} from "./activity-support";

export const buildAdminPsychologistActivityItems = async ({
  id,
  period,
  repository = new AdminPsychologistActivitiesRepository(),
}: {
  id: string;
  period?: ActivityPeriod;
  repository?: AdminPsychologistActivitiesRepository;
}) => {
  const currentPeriod = period ?? { end: null, start: null };
  const profile = await repository.findPsychologist(id);
  if (!profile) return null;

  const psychologistUserId = profile.user.id;
  const [
    posts,
    replies,
    postSaves,
    replySaves,
    subscriptions,
    contactRequests,
    reviews,
    reports,
    adminLogs,
  ] = await Promise.all([
    repository.listAuthoredPosts(psychologistUserId, currentPeriod.start, currentPeriod.end),
    repository.listAuthoredReplies(psychologistUserId, currentPeriod.start, currentPeriod.end),
    repository.listPostSavesByPsychologist(
      psychologistUserId,
      currentPeriod.start,
      currentPeriod.end,
    ),
    repository.listReplySavesByPsychologist(
      psychologistUserId,
      currentPeriod.start,
      currentPeriod.end,
    ),
    repository.listSubscriptions(profile.id, currentPeriod.start, currentPeriod.end),
    repository.listContactRequests(psychologistUserId, currentPeriod.start, currentPeriod.end),
    repository.listReviews(psychologistUserId, currentPeriod.start, currentPeriod.end),
    repository.listReports(psychologistUserId, currentPeriod.start, currentPeriod.end),
    repository.listAdminActivityLogs(
      Array.from(new Set([profile.id, profile.user.id])),
      currentPeriod.start,
      currentPeriod.end,
    ),
  ]);

  const psychologistActor = actorFromUser(profile.user);
  const activities: AdminPsychologistActivityItem[] = [
    ...profileEvents(profile),
    ...subscriptions.map((subscription) =>
      makeActivity({
        actor: psychologistActor,
        area: "financeiro",
        description: `Plano ${subscription.plan.name} registrado com status ${subscription.status}.`,
        id: `subscription-${subscription.id}`,
        occurred_at: subscription.grant_started_at ?? subscription.createdAt,
        source: "professional_subscription.createdAt/grant_started_at",
        type: "subscription_started",
      }),
    ),
    ...posts.map((post) =>
      makeActivity({
        actor: psychologistActor,
        area: "comunidade",
        description: `Criou o post "${post.title}" na comunidade ${post.community.name}.`,
        detail_url: postUrl(post),
        id: `post-${post.id}`,
        occurred_at: post.createdAt,
        source: "community_post.author_id",
        type: "post_created",
      }),
    ),
    ...replies.map((reply) =>
      makeActivity({
        actor: psychologistActor,
        area: "comunidade",
        description: `Respondeu em "${reply.post.title}" na comunidade ${reply.post.community.name}: ${excerpt(
          reply.content,
        )}.`,
        detail_url: replyUrl(reply),
        id: `reply-${reply.id}`,
        occurred_at: reply.createdAt,
        source: "post_reply.author_id",
        type: "reply_created",
      }),
    ),
    ...postSaves.map((save) =>
      makeActivity({
        actor: psychologistActor,
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
        actor: psychologistActor,
        area: "comunidade",
        description: `Salvou uma resposta em "${save.reply.post.title}" da comunidade ${save.reply.post.community.name}.`,
        detail_url: replyUrl(save.reply),
        id: `reply-save-${save.id}`,
        occurred_at: save.createdAt,
        source: "post_reply_save.user_id",
        type: "reply_saved",
      }),
    ),
    ...contactRequests.map((request) =>
      makeActivity({
        actor: actorFromUser(request.user),
        area: "atendimento",
        description: "Contato via WhatsApp registrado para este perfil profissional.",
        id: `contact-${request.id}`,
        occurred_at: request.createdAt,
        source: "contact_request",
        type: "whatsapp_click",
      }),
    ),
    ...reviews.flatMap((review) => {
      const events = [
        makeActivity({
          actor: actorFromUser(review.author),
          area: "avaliacoes",
          description: `Recebeu avaliação de ${review.rating} estrela${review.rating === 1 ? "" : "s"}: ${excerpt(
            review.comment,
          )}.`,
          id: `review-${review.id}`,
          occurred_at: review.createdAt,
          source: "professional_review.createdAt",
          type: "review_received" as const,
        }),
      ];

      if (review.responded_at && review.response) {
        events.push(
          makeActivity({
            actor: psychologistActor,
            area: "avaliacoes",
            description: `Resposta do psicólogo registrada para avaliação: ${excerpt(
              review.response,
            )}.`,
            id: `review-response-${review.id}`,
            occurred_at: review.responded_at,
            source: "professional_review.responded_at",
            type: "review_responded",
          }),
        );
      }

      return events;
    }),
    ...reports.map((report) => {
      const content = reportContent(report);

      return makeActivity({
        actor: null,
        area: "denuncias",
        description: `Denúncia registrada em ${content.typeLabel} do psicólogo. Motivo: ${reasonLabel(
          report.reason,
        )}. Conteúdo: "${content.title}".`,
        detail_url: content.detailUrl,
        id: `report-${report.id}`,
        occurred_at: report.createdAt,
        source: "post_report",
        type: "report_received",
      });
    }),
    ...adminLogs.flatMap((log) => {
      const type = adminLogType(log.action);
      if (!type) return [];
      const isAccountAction = log.action.startsWith("psychologist_account_");
      const isReportAction = log.action.startsWith("psychologist_report_");
      const isSubscriptionAction = log.action.startsWith("psychologist_subscription_");

      return [
        makeActivity({
          actor: actorFromAdmin(log.admin),
          area: isAccountAction
            ? "conta"
            : isReportAction
              ? "denuncias"
              : isSubscriptionAction
                ? "financeiro"
                : "perfil",
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

  return { activities, profile };
};

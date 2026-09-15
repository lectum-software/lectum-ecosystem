import { normalizeProfessionalDisplayName } from "@/utils/professional-name";
import { parseStoredCrp } from "@/utils/professional-registry";
import { hasProfessionalRegistryApproval } from "@/utils/subscription-entitlement";
import type { AdminModerationOperationalAlertDTO } from "../../DTOs/IAdminModerationDTO";
import type {
  AdminOperationalPsychologistRecord,
  AdminPatientCommunityEngagementSignals,
  AdminPatientCommunityEngagementTarget,
  AdminPostReportRecord,
  AdminPsychologistMetricCountRecord,
  AdminRegistrationFailureUserRecord,
  AdminUncoveredPatientPostRecord,
} from "../../repositories/interfaces/IAdminModerationRepository";
import { communityDTO } from "./community-dto";
import { COMMUNITY_ENGAGEMENT_LABELS, COMMUNITY_ENGAGEMENT_SCORE_WEIGHTS } from "./events";
import {
  type AdminModerationAlertUser,
  compactText,
  hoursSince,
  humanAge,
  type PatientCommunityEngagementCounts,
  type PatientCommunityEngagementSegment,
  type PatientCommunityEngagementSummary,
  postReportPriority,
  postReportReasonLabel,
  postReportStatusLabel,
  registrationAlertEntityType,
  registrationAlertHref,
  registrationFailureAlertUser,
  registrationModeLabel,
  reportAuthor,
  reportAuthorAlertUser,
  reportDTO,
  roleLabel,
  toJsonStringArray,
  uncoveredPostAuthorAlertUser,
} from "./reports";

export const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

export const hasText = (value?: string | null) => Boolean(value?.trim());

export const hasValidWhatsapp = (value?: string | null) => {
  const digits = onlyDigits(value);

  return digits.length >= 8 && digits.length <= 15;
};

export const whatsappStatusLabel = (value?: string | null) => {
  const digits = onlyDigits(value);
  if (digits.length === 0) return "ausente";

  return `${digits.length} dígitos armazenados`;
};

export const activeSubscriptions = (profile: AdminOperationalPsychologistRecord, now: Date) =>
  profile.subscriptions.filter((subscription) => {
    if (subscription.status !== "ativa") return false;

    return !subscription.current_period_end || subscription.current_period_end > now;
  });

export const isProfessionalSubscription = (
  subscription: AdminOperationalPsychologistRecord["subscriptions"][number],
) => subscription.plan.slug !== "gratuito";

export const isCourtesySubscription = (
  subscription: AdminOperationalPsychologistRecord["subscriptions"][number],
) => subscription.source === "admin_grant";

export const subscriptionPlanLabel = (
  subscription: AdminOperationalPsychologistRecord["subscriptions"][number],
) =>
  isCourtesySubscription(subscription)
    ? "Plano Cortesia"
    : subscription.plan.name || subscription.plan.slug;

export const pickCurrentSubscription = (profile: AdminOperationalPsychologistRecord, now: Date) => {
  const subscriptions = activeSubscriptions(profile, now);
  if (subscriptions.length === 0) return null;

  return [...subscriptions].sort((left, right) => {
    const leftProfessional = Number(isProfessionalSubscription(left));
    const rightProfessional = Number(isProfessionalSubscription(right));
    if (leftProfessional !== rightProfessional) return rightProfessional - leftProfessional;

    return right.createdAt.getTime() - left.createdAt.getTime();
  })[0];
};

export const profileStartedAt = (
  subscription: AdminOperationalPsychologistRecord["subscriptions"][number],
) => subscription.grant_started_at ?? subscription.createdAt;

export const psychologistLabel = (profile: AdminOperationalPsychologistRecord) => {
  const professionalName = [profile.professional_first_name, profile.professional_last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return (
    normalizeProfessionalDisplayName(professionalName) ||
    normalizeProfessionalDisplayName(profile.user.name) ||
    "Psicólogo"
  );
};

export const normalizeSelectedProfessionalGender = (gender?: string | null) =>
  String(gender ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const psychologistRoleLabel = (profile: AdminOperationalPsychologistRecord) => {
  const selectedGender = normalizeSelectedProfessionalGender(profile.gender);

  return selectedGender.includes("feminino") || selectedGender.includes("mulher")
    ? "Psicóloga"
    : "Psicólogo";
};

export const psychologistAlertUser = (
  profile: AdminOperationalPsychologistRecord,
  name: string,
  registryVerified: boolean,
): AdminModerationAlertUser => ({
  id: profile.user_id,
  name,
  role: "psicologo",
  role_label: psychologistRoleLabel(profile),
  show_verified_badge: registryVerified,
});

export const hasRegistryApproval = (profile: AdminOperationalPsychologistRecord) =>
  hasProfessionalRegistryApproval({
    cfp_verified_at: profile.cfp_verified_at,
    crp_status: profile.crp_status,
    subscriptions: profile.subscriptions.filter(isProfessionalSubscription),
  });

export const missingRequiredPublishingSettings = (
  profile: AdminOperationalPsychologistRecord,
  currentSubscription: AdminOperationalPsychologistRecord["subscriptions"][number],
) => {
  const missing: string[] = [];
  const { crp_number, crp_region } = parseStoredCrp(profile.crp);

  if (!normalizeProfessionalDisplayName(profile.user.name)) missing.push("nome profissional");
  if (!hasText(profile.video_url)) missing.push("vídeo de apresentação");
  if (!hasText(profile.modality)) missing.push("modalidade");
  if (profile.user.psychologist_specialties.length === 0) missing.push("especialidade");
  if (profile.user.psychologist_services.length === 0) missing.push("serviço");
  if (profile.user.psychologist_approaches.length === 0) missing.push("abordagem");
  if (toJsonStringArray(profile.target_audience).length === 0) missing.push("público atendido");
  if (!hasText(profile.gender)) missing.push("gênero");
  if (!hasText(profile.cpf)) missing.push("CPF");
  if (!profile.birthdate) missing.push("data de nascimento");
  if (!hasText(crp_region)) missing.push("regional do CRP");
  if (!hasText(crp_number)) missing.push("número do CRP");
  if (!hasText(profile.professional_address_state)) missing.push("UF de atendimento");
  if (!hasText(profile.professional_address_city)) missing.push("cidade de atendimento");
  if (isProfessionalSubscription(currentSubscription) && !hasRegistryApproval(profile)) {
    missing.push("CRP aprovado");
  }

  return missing;
};

export const countMap = (items: AdminPsychologistMetricCountRecord[]) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item.psychologist_id, item._count._all);

  return map;
};

export const createPatientCommunityEngagementCounts = (): PatientCommunityEngagementCounts => ({
  posts: 0,
  replies: 0,
  saves: 0,
  shares: 0,
  votes: 0,
});

export const patientCommunityEngagementKey = (userId: string, communityId: string) =>
  `${userId}:${communityId}`;

export const getPatientCommunityEngagementCounts = (
  countsByTarget: Map<string, PatientCommunityEngagementCounts>,
  userId: string,
  communityId: string,
) => {
  const key = patientCommunityEngagementKey(userId, communityId);
  const current = countsByTarget.get(key);
  if (current) return current;

  const next = createPatientCommunityEngagementCounts();
  countsByTarget.set(key, next);
  return next;
};

export const patientCommunityEngagementScoreContribution = (
  metricId: keyof PatientCommunityEngagementCounts,
  value: number,
) => Math.max(0, value) * COMMUNITY_ENGAGEMENT_SCORE_WEIGHTS[metricId];

export const patientCommunityEngagementScore = (counts: PatientCommunityEngagementCounts) =>
  Math.round(
    patientCommunityEngagementScoreContribution("posts", counts.posts) +
      patientCommunityEngagementScoreContribution("replies", counts.replies) +
      patientCommunityEngagementScoreContribution("votes", counts.votes) +
      patientCommunityEngagementScoreContribution("saves", counts.saves) +
      patientCommunityEngagementScoreContribution("shares", counts.shares),
  );

export const classifyPatientCommunityEngagement = (
  counts: PatientCommunityEngagementCounts,
): PatientCommunityEngagementSegment => {
  const score = patientCommunityEngagementScore(counts);
  const authoredActivity = counts.posts + counts.replies;
  const totalActivity = authoredActivity + counts.votes + counts.saves + counts.shares;

  if (score >= 16 || authoredActivity >= 8) return "very_active";
  if (score >= 6 || authoredActivity >= 3) return "active";
  if (totalActivity > 0) return "low";

  return "none";
};

export const postVoteCommunityId = (
  vote: AdminPatientCommunityEngagementSignals["votes"][number],
) => vote.post?.community_id ?? vote.reply?.post.community_id ?? null;

export const patientCommunityEngagementSummary = (
  counts: PatientCommunityEngagementCounts,
): PatientCommunityEngagementSummary => {
  const segment = classifyPatientCommunityEngagement(counts);

  return {
    label: COMMUNITY_ENGAGEMENT_LABELS[segment],
  };
};

export const buildPatientCommunityEngagementByTarget = (
  targets: AdminPatientCommunityEngagementTarget[],
  signals: AdminPatientCommunityEngagementSignals,
) => {
  const targetKeys = new Set(
    targets.map((target) => patientCommunityEngagementKey(target.userId, target.communityId)),
  );
  const countsByTarget = new Map<string, PatientCommunityEngagementCounts>();

  for (const post of signals.posts) {
    if (!targetKeys.has(patientCommunityEngagementKey(post.author_id, post.community_id))) continue;

    getPatientCommunityEngagementCounts(countsByTarget, post.author_id, post.community_id).posts +=
      1;
  }

  for (const reply of signals.replies) {
    const communityId = reply.post.community_id;
    if (!targetKeys.has(patientCommunityEngagementKey(reply.author_id, communityId))) continue;

    getPatientCommunityEngagementCounts(countsByTarget, reply.author_id, communityId).replies += 1;
  }

  for (const vote of signals.votes) {
    const communityId = postVoteCommunityId(vote);
    if (!communityId || !targetKeys.has(patientCommunityEngagementKey(vote.user_id, communityId))) {
      continue;
    }

    getPatientCommunityEngagementCounts(countsByTarget, vote.user_id, communityId).votes += 1;
  }

  for (const save of signals.postSaves) {
    const communityId = save.post.community_id;
    if (!targetKeys.has(patientCommunityEngagementKey(save.user_id, communityId))) continue;

    getPatientCommunityEngagementCounts(countsByTarget, save.user_id, communityId).saves += 1;
  }

  for (const save of signals.replySaves) {
    const communityId = save.reply.post.community_id;
    if (!targetKeys.has(patientCommunityEngagementKey(save.user_id, communityId))) continue;

    getPatientCommunityEngagementCounts(countsByTarget, save.user_id, communityId).saves += 1;
  }

  for (const share of signals.shares) {
    const communityId = share.post.community_id;
    if (
      !share.user_id ||
      !targetKeys.has(patientCommunityEngagementKey(share.user_id, communityId))
    ) {
      continue;
    }

    getPatientCommunityEngagementCounts(countsByTarget, share.user_id, communityId).shares += 1;
  }

  const engagementByTarget = new Map<string, PatientCommunityEngagementSummary>();

  for (const target of targets) {
    const key = patientCommunityEngagementKey(target.userId, target.communityId);
    engagementByTarget.set(
      key,
      patientCommunityEngagementSummary(
        countsByTarget.get(key) ?? createPatientCommunityEngagementCounts(),
      ),
    );
  }

  return engagementByTarget;
};

export const mapReportAlert = (
  report: AdminPostReportRecord,
  now: Date,
): AdminModerationOperationalAlertDTO => {
  const isReply = report.target_type === "reply" || Boolean(report.reply_id);
  const community = isReply && report.reply ? report.reply.post.community : report.post.community;
  const detail = reportDTO(report);
  const targetId = isReply
    ? (report.reply?.id ?? report.reply_id ?? report.target_id)
    : report.post.id;
  const targetLabel = isReply
    ? `Resposta em ${report.reply?.post.title ?? report.post.title}`
    : report.post.title;
  const targetExcerpt = isReply ? report.reply?.content : report.post.content;
  const href = targetId
    ? `/comunidades/${community.slug}/conteudo/${isReply ? "reply" : "post"}/${targetId}`
    : null;
  const reportStatusLabel = postReportStatusLabel(report.status);
  const author = reportAuthor(report);

  return {
    action_href: href,
    action_label: "Abrir conteúdo denunciado",
    age_hours: hoursSince(report.createdAt, now),
    community: communityDTO(community),
    created_at: report.createdAt,
    description: compactText(report.description ?? targetExcerpt, 180),
    entity: {
      href,
      id: targetId ?? report.target_id,
      label: targetLabel,
      type: isReply ? "reply" : "post",
    },
    facts: [
      { label: "Motivo", value: postReportReasonLabel(report.reason) },
      { label: "Status", value: reportStatusLabel },
      { label: "Denunciante", value: report.reporter.role },
      { label: "Idade", value: humanAge(report.createdAt, now) },
    ],
    group: "denuncias",
    id: `post-report-${report.id}`,
    priority: postReportPriority(report.status),
    report: detail,
    source: "post_report",
    title: `Denúncia de ${isReply ? "resposta" : "post"} ${reportStatusLabel.toLowerCase()}`,
    type: "post_report",
    user: reportAuthorAlertUser(author),
  };
};

export const mapUncoveredPatientPostAlert = (
  post: AdminUncoveredPatientPostRecord,
  now: Date,
  engagement: PatientCommunityEngagementSummary,
): AdminModerationOperationalAlertDTO => {
  const href = `/comunidades/${post.community.slug}/conteudo/post/${post.id}`;
  const user = uncoveredPostAuthorAlertUser(post.author);

  return {
    action_href: href,
    action_label: "Abrir post",
    age_hours: hoursSince(post.createdAt, now),
    community: communityDTO(post.community),
    created_at: post.createdAt,
    description: `Post de paciente publicado há ${humanAge(
      post.createdAt,
      now,
    )} ainda sem resposta de psicólogo. Trecho: ${compactText(post.content, 120)}`,
    entity: {
      href,
      id: post.id,
      label: post.title,
      type: "post",
    },
    facts: [
      { label: "Comunidade", value: post.community.name },
      { label: "Engajamento na comunidade", value: engagement.label },
      { label: "Idade", value: humanAge(post.createdAt, now) },
      { label: "Respostas totais", value: String(post.replies_count) },
    ],
    group: "operacional",
    id: `uncovered-post-${post.id}`,
    priority: "medium",
    source: "community_post+post_reply+user.role+post_vote+post_save+post_reply_save+post_share",
    title: "Post de paciente sem cobertura há 48h",
    type: "patient_post_without_coverage",
    user,
  };
};

export const mapRegistrationFailureAlert = (
  user: AdminRegistrationFailureUserRecord,
  now: Date,
): AdminModerationOperationalAlertDTO => {
  const href = registrationAlertHref(user);
  const mode = registrationModeLabel(user.provider);
  const alertUser = registrationFailureAlertUser(user);

  return {
    action_href: href,
    action_label: "Abrir usuário",
    age_hours: hoursSince(user.createdAt, now),
    community: null,
    created_at: user.createdAt,
    description: `${alertUser.name} iniciou cadastro via ${mode}, mas ainda não confirmou o e-mail.`,
    entity: {
      href,
      id: user.id,
      label: alertUser.name,
      type: registrationAlertEntityType(user),
    },
    facts: [
      { label: "Modo de cadastro", value: mode },
      { label: "Email", value: user.email },
      { label: "Perfil", value: roleLabel(user.role) },
      { label: "Status de e-mail", value: "Pendente" },
    ],
    group: "operacional",
    id: `registration-error-${user.id}`,
    priority: "medium",
    source: "user.confirmed+user.provider",
    title: "Cadastro sem confirmação de e-mail",
    type: "registration_error",
    user: alertUser,
  };
};

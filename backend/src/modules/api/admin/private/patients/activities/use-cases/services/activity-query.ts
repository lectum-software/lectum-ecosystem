import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminPatientActivitiesDTO,
  IAdminPatientActivitiesDTO,
} from "../../DTOs/IAdminPatientActivitiesDTO";
import { buildAdminPatientActivityItems } from "./activity-builder";
import {
  activityMatchesQuery,
  filtersFromActivities,
  normalizeQuery,
  notFound,
  resolvePeriod,
} from "./activity-support";

export const showAdminPatientActivities = async (
  data: IAdminPatientActivitiesDTO,
): Promise<Resolve> => {
  const query = normalizeQuery(data.q ?? {});
  const period = resolvePeriod({ from: query.from, to: query.to });
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const activityFeed = await buildAdminPatientActivityItems({
    id: data.p.id,
    period: period.current,
  });
  if (!activityFeed) return notFound();

  const filters = filtersFromActivities(activityFeed.activities);
  const filtered = activityFeed.activities.filter((item) => activityMatchesQuery(item, query));
  const count = filtered.length;
  const pages = Math.max(1, Math.ceil(count / query.limit));
  const page = Math.min(query.page, pages);
  const dataSlice = filtered.slice((page - 1) * query.limit, page * query.limit);

  const response: AdminPatientActivitiesDTO = {
    active_filters_count: [
      query.area !== "all" ? query.area : "",
      query.type !== "all" ? query.type : "",
      query.q,
      query.from && query.to ? "period" : "",
    ].filter(Boolean).length,
    count,
    coverage_note:
      "As atividades consideram posts, comentários, votos, salvamentos, entrada em comunidades, avaliações e ações administrativas auditadas. Acesso à conta não é exibido porque não há histórico confiável por ocorrência.",
    data: dataSlice,
    export: {
      available: false,
      reason: "A exportação de atividades ainda não está disponível.",
    },
    filters,
    page,
    pages,
    per_page: query.limit,
    period: period.period,
    source:
      "user+patient_profile+community_member+community_post+post_reply+post_vote+post_save+post_reply_save+professional_review+admin_activity_log",
    unavailable: [
      {
        description:
          "Acesso à conta não é exibido porque o histórico disponível não registra cada ocorrência de forma confiável.",
        id: "login",
        label: "Login",
        source: "user_token",
      },
    ],
  };

  return {
    status: 200,
    ...msg("show", {}),
    data: response,
  };
};

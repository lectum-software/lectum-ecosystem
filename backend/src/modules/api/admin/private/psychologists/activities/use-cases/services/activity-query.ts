import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminPsychologistActivitiesDTO,
  IAdminPsychologistActivitiesDTO,
} from "../../DTOs/IAdminPsychologistActivitiesDTO";
import { buildAdminPsychologistActivityItems } from "./activity-builder";
import {
  activityMatchesQuery,
  filtersFromActivities,
  normalizeQuery,
  notFound,
  resolvePeriod,
} from "./activity-support";

export const showAdminPsychologistActivities = async (
  data: IAdminPsychologistActivitiesDTO,
): Promise<Resolve> => {
  const query = normalizeQuery(data.q ?? {});
  const period = resolvePeriod({ from: query.from, to: query.to });
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const activityFeed = await buildAdminPsychologistActivityItems({
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

  const response: AdminPsychologistActivitiesDTO = {
    active_filters_count: [
      query.area !== "all" ? query.area : "",
      query.type !== "all" ? query.type : "",
      query.q,
      query.from && query.to ? "period" : "",
    ].filter(Boolean).length,
    count,
    coverage_note: "",
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
      "user+psychologist_profile+professional_subscription+community_post+post_reply+post_save+post_reply_save+contact_request+professional_review+post_report+admin_activity_log",
    unavailable: [],
  };

  return {
    status: 200,
    ...msg("show", {}),
    data: response,
  };
};

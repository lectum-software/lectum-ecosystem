import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type { IAdminPsychologistStatisticsDTO } from "../../DTOs/IAdminPsychologistEngagementDTO";
import { AdminPsychologistEngagementRepository } from "../../repositories/AdminPsychologistEngagementRepository";
import { resolvePeriod } from "./business-content";
import { normalizeStatisticsQuery, notFound } from "./community-coverage";
import { buildAdminPsychologistStatisticsContext } from "./statistics-context";
import { buildAdminPsychologistStatisticsResponse } from "./statistics-response";

export const showAdminPsychologistStatistics = async (
  data: IAdminPsychologistStatisticsDTO,
): Promise<Resolve> => {
  const query = normalizeStatisticsQuery(data.q ?? {});

  const repository = new AdminPsychologistEngagementRepository();

  const profile = await repository.findPsychologist(data.p.id);

  if (!profile) return notFound();

  const period = resolvePeriod(query, profile.user.createdAt);

  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const context = await buildAdminPsychologistStatisticsContext({
    period,
    profile,
    query,
    repository,
  });
  const response = buildAdminPsychologistStatisticsResponse(context);

  return {
    status: 200,
    ...msg("show", {}),
    data: response,
  };
};

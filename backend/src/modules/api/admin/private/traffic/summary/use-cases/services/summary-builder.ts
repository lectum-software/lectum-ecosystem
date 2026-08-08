import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type { AdminTrafficQuery, AdminTrafficSummary } from "../../DTOs/IAdminTrafficSummaryDTO";
import { AdminTrafficRepository } from "../../repositories/AdminTrafficRepository";
import { buildConversionGroups } from "./conversion-groups";
import { buildDevices, buildLocations, buildUserTypes } from "./device-location";
import { buildConversions, buildEntryPages } from "./entry-conversions";
import {
  buildOnlineNow,
  buildOverviewCards,
  loadStats,
  onlineNowWindow,
  resolvePeriod,
} from "./overview";
import { buildQuality, buildRankings, unavailableMetrics } from "./quality-ranking";

import { buildTimeline, buildTrafficSources } from "./timeline-sources";

export const buildTrafficSummary = async (query: AdminTrafficQuery): Promise<Resolve> => {
  const repository = new AdminTrafficRepository();
  const allPeriodStartDate =
    query?.period === "all" ? await repository.findEarliestTrafficDate() : null;
  const resolvedPeriod = resolvePeriod(query ?? {}, allPeriodStartDate);
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, period, previous } = resolvedPeriod.period;
  const onlineWindow = onlineNowWindow();
  const [currentStats, previousStats, onlineSessions] = await Promise.all([
    loadStats(repository, current),
    loadStats(repository, previous),
    repository.listOnlineSessions(onlineWindow),
  ]);
  const onlineVisitorIds = [...new Set(onlineSessions.map((session) => session.visitor_id))];
  const [rankings, onlinePriorSessions] = await Promise.all([
    buildRankings(repository, currentStats),
    repository.listVisitorSessionsBefore(onlineVisitorIds, onlineWindow.start),
  ]);
  const onlinePriorVisitorIds = new Set(onlinePriorSessions.map((session) => session.visitor_id));
  const locations = buildLocations(currentStats);
  const quality = buildQuality(currentStats, previousStats);

  const summary: AdminTrafficSummary = {
    conversions: buildConversions(currentStats, previousStats),
    conversion_groups: buildConversionGroups(currentStats),
    devices: buildDevices(currentStats),
    entry_pages: buildEntryPages(currentStats),
    locations,
    online_now: buildOnlineNow(onlineSessions, onlineWindow, onlinePriorVisitorIds),
    overview_cards: buildOverviewCards(currentStats, previousStats),
    period,
    quality,
    top_communities: rankings.topCommunities,
    top_posts: rankings.topPosts,
    top_psychologists: rankings.topPsychologists,
    timeline: {
      points: buildTimeline(currentStats, resolvedPeriod.period),
      source: "visitor_session+page_view_event+important_action_event",
    },
    traffic_sources: buildTrafficSources(currentStats),
    unavailable: [],
    user_types: buildUserTypes(currentStats),
  };

  summary.unavailable = unavailableMetrics(summary);

  return {
    status: 200,
    ...msg("index", {}),
    data: summary,
  };
};

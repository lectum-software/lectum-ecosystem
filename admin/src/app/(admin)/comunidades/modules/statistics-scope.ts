export const isCurrentCommunityTotal = (id: string) =>
  id === "followers_patients" || id === "followers_psychologists";

export const communityStatisticScopeLabel = (id: string) =>
  isCurrentCommunityTotal(id) ? "Total atual" : "No período";

export const communityStatisticSeriesLabel = (id: string, label: string) =>
  isCurrentCommunityTotal(id) ? `${label} — base atual até a data` : label;

export const COMMUNITY_CURRENT_TOTALS_DESCRIPTION =
  "Totais de seguidores refletem a base atual, sem filtro de período. A série considera as datas de entrada dessa base; não reconstrói seguidores que já saíram.";

import {
  extractSearchTermsFromTrafficPath,
  hasDirectorySelectedFilterParams,
} from "@/utils/analytics-traffic-path";

export const analyticsDay = (date: Date) =>
  new Date(date.getTime() - 3 * 3600000).toISOString().slice(0, 10);

export const originGroup = (
  path: string | null,
): "presentation_video" | "communities" | "favorites" | "profile" | "unknown" => {
  if (!path) return "unknown";
  const pathname = path.split("?")[0];
  if (["/psicologos", "/psychologists", "/app/psicologos", "/app/psychologists"].includes(pathname))
    return "presentation_video";
  if (/^\/(?:app\/)?(?:comunidades|communities)(?:\/|$)/.test(pathname)) return "communities";
  if (/^\/(?:app\/)?(?:favorites|favoritos)(?:\/|$)/.test(pathname)) return "favorites";
  if (
    /^\/(?:psicologos|psychologists|app\/(?:psicologo|psychologist|psicologos|psychologists))\/[^/]+\/?$/.test(
      pathname,
    )
  )
    return "profile";
  return "unknown";
};

export const dailyPoints = (events: Array<{ date: Date; value?: number }>) => {
  const counts = new Map<string, number>();
  for (const event of events) {
    const day = analyticsDay(event.date);
    counts.set(day, (counts.get(day) ?? 0) + (event.value ?? 1));
  }
  return [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
};

export const uniqueDailyContacts = <
  T extends { id: string; user_id: string | null; visitor_key: string | null; createdAt: Date },
>(
  events: T[],
) => {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key =
      analyticsDay(event.createdAt) +
      ":" +
      (event.user_id
        ? `u:${event.user_id}`
        : event.visitor_key
          ? `v:${event.visitor_key}`
          : `legacy:${event.id}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const presentationVideoOrigin = (path: string | null) => {
  const origin = originGroup(path);
  if (origin === "profile") return "profile";
  if (origin !== "presentation_video") return "unknown";
  return hasDirectorySelectedFilterParams(path) ||
    extractSearchTermsFromTrafficPath(path).length > 0
    ? "search"
    : "explore";
};

export const analyticsDay = (date: Date) =>
  new Date(date.getTime() - 3 * 3600000).toISOString().slice(0, 10);

export const originGroup = (
  path: string | null,
): "presentation_video" | "communities" | "unknown" => {
  if (!path) return "unknown";
  const pathname = path.split("?")[0];
  if (pathname === "/psicologos" || pathname === "/app/psychologists") return "presentation_video";
  if (/^\/(?:app\/)?(?:comunidades|communities)(?:\/|$)/.test(pathname)) return "communities";
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

import { distinctWhatsappPeople, type PersonAction } from "@/modules/whatsapp-reports/people";
import type { AnalyticsTimeline } from "../../DTOs/IAnalyticsDTO";
import { analyticsDay, dailyPoints } from "./timeline";

export function whatsappTimeline(
  groups: Array<{ id: string; label: string; events: PersonAction[] }>,
): AnalyticsTimeline {
  return {
    granularity: "day",
    series: groups.map(({ id, label, events }) => {
      const byDay = new Map<string, PersonAction[]>();
      for (const event of events) {
        const day = analyticsDay(event.occurred_at);
        const items = byDay.get(day) ?? [];
        items.push(event);
        byDay.set(day, items);
      }
      return {
        id,
        label,
        total: distinctWhatsappPeople(events).length,
        points: dailyPoints(
          [...byDay.values()].flatMap((items) =>
            distinctWhatsappPeople(items).map((event) => ({ date: event.occurred_at })),
          ),
        ),
      };
    }),
  };
}

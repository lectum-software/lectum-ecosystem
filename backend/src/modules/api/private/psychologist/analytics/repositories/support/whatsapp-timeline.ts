import type { PersonAction } from "@/modules/whatsapp-reports/people";
import type { AnalyticsTimeline } from "../../DTOs/IAnalyticsDTO";
import { dailyPoints } from "./timeline";
import { distinctWhatsappActions } from "./whatsapp-actions";

export function whatsappTimeline(
  groups: Array<{ id: string; label: string; events: PersonAction[] }>,
): AnalyticsTimeline {
  return {
    granularity: "day",
    series: groups.map(({ id, label, events }) => {
      const actions = distinctWhatsappActions(events);
      return {
        id,
        label,
        total: actions.length,
        points: dailyPoints(actions.map((event) => ({ date: event.occurred_at }))),
      };
    }),
  };
}

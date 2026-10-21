import { distinctWhatsappPeople, type PersonAction } from "@/modules/whatsapp-reports/people";

// A stored event is an action, not a person. Repeated references to its ID are not new clicks.
export function distinctWhatsappActions<T extends PersonAction>(actions: T[]): T[] {
  return [...new Map(actions.map((action) => [action.id, action])).values()];
}

export function whatsappActionSummary(actions: PersonAction[]) {
  const events = distinctWhatsappActions(actions);
  const people = distinctWhatsappPeople(events).length;
  return {
    whatsapp_clicks: events.length,
    whatsapp_unique_people: people,
    whatsapp_clicks_per_person: people ? events.length / people : null,
  };
}

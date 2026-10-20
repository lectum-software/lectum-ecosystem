import { distinctWhatsappPeople, type PersonAction } from "@/modules/whatsapp-reports/people";
import {
  COMMUNITY_WHATSAPP_POST_TARGET_TYPES,
  COMMUNITY_WHATSAPP_REPLY_TARGET_TYPES,
} from "./traffic";

export type HighlightAction = PersonAction & {
  target_id: string | null;
  target_type: string | null;
};

export const rankCommunityHighlights = (actions: HighlightAction[], kind: "posts" | "replies") => {
  const types: readonly string[] =
    kind === "posts" ? COMMUNITY_WHATSAPP_POST_TARGET_TYPES : COMMUNITY_WHATSAPP_REPLY_TARGET_TYPES;
  const groups = new Map<string, HighlightAction[]>();
  for (const action of actions) {
    if (!action.target_id || !action.target_type || !types.includes(action.target_type)) continue;
    const group = groups.get(action.target_id) ?? [];
    group.push(action);
    groups.set(action.target_id, group);
  }
  return [...groups]
    .map(([id, events]) => ({ id, whatsapp_clicks: distinctWhatsappPeople(events).length }))
    .filter((item) => item.whatsapp_clicks > 0)
    .sort((a, b) => b.whatsapp_clicks - a.whatsapp_clicks || a.id.localeCompare(b.id))
    .slice(0, 5);
};

export const highlightExcerpt = (content: string) =>
  content
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

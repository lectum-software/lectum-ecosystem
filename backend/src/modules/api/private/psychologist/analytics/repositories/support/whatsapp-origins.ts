import type { PersonAction } from "@/modules/whatsapp-reports/people";
import { originGroup } from "./timeline";
import {
  COMMUNITY_WHATSAPP_POST_TARGET_TYPES,
  COMMUNITY_WHATSAPP_REPLY_TARGET_TYPES,
  isCommunityTopMentorsTrafficPath,
  isFavoritesTrafficPath,
} from "./traffic";
import { distinctWhatsappActions } from "./whatsapp-actions";

type Action = PersonAction & {
  action_type: string;
  target_type: string | null;
  page_kind: string;
  path: string | null;
};
export function whatsappOrigin(action: Action) {
  const surface = originGroup(action.path);
  if (surface === "profile" || surface === "favorites") return surface;
  if (
    action.action_type === "psychologist_video_whatsapp_click" &&
    (surface === "presentation_video" || !action.path)
  )
    return "presentation_video";
  if (
    [...COMMUNITY_WHATSAPP_POST_TARGET_TYPES, ...COMMUNITY_WHATSAPP_REPLY_TARGET_TYPES].some(
      (type) => type === action.target_type,
    ) ||
    isCommunityTopMentorsTrafficPath(action.path, action.page_kind)
  )
    return "communities";
  if (isFavoritesTrafficPath(action.path)) return "favorites";
  if (surface === "communities") return "communities";
  if (!action.path && action.page_kind === "psychologist_profile") return "profile";
  return "unknown";
}
export function whatsappOriginGroups(actions: Action[]) {
  const events = distinctWhatsappActions(actions);
  return [
    { id: "presentation_video", label: "Vídeo de apresentação" },
    { id: "communities", label: "Comunidades" },
    { id: "profile", label: "Perfil" },
    { id: "favorites", label: "Favoritos" },
    { id: "unknown", label: "Origem não identificada" },
  ].map((group) => ({
    ...group,
    events: events.filter((action) => whatsappOrigin(action) === group.id),
  }));
}

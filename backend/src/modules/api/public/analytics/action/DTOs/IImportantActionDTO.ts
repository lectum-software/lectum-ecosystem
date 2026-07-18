import type { important_action_event } from "@/interfaces/objects";
import type { AnalyticsDisplayMode } from "../../helpers/tracking";

export type ImportantActionType =
  | "psychologist_directory_filter_search"
  | "psychologist_video_favorite"
  | "psychologist_video_profile_access"
  | "psychologist_video_share"
  | "psychologist_video_whatsapp_click"
  | "pwa_install_prompt_accepted"
  | "pwa_installed"
  | "whatsapp_click";

export interface IImportantActionDTO {
  p: Record<string, never>;
  q: Record<string, never>;
  b: {
    visitor_id: string;
    session_id: string;
    action_type: ImportantActionType;
    path?: string;
    page_kind?: string;
    target_id?: string;
    target_type?: string;
    display_mode?: AnalyticsDisplayMode;
    occurred_at?: string;
  };
}

export type CreateImportantActionInput = {
  visitorId: string;
  sessionId: string;
  userId?: string | null;
  actionType: ImportantActionType;
  path?: string | null;
  pageKind: string;
  targetType?: string | null;
  targetId?: string | null;
  displayMode: AnalyticsDisplayMode;
  occurredAt: Date;
};

export type ImportantActionResult = {
  tracked: boolean;
  id: string | null;
  visitor_id: string;
  session_id: string;
  user_id: string | null;
  action_type: ImportantActionType;
  path: string | null;
  page_kind: string;
  target_type: string | null;
  target_id: string | null;
  display_mode: AnalyticsDisplayMode;
};

export type ImportantActionEvent = important_action_event;

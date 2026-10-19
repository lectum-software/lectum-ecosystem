import { callEndpoint } from "@/api/generator";
import { handleReq } from "@/api/handle";

export type WhatsappWeekReport = {
  id: string;
  start_label: string;
  end_label: string;
  week_start: string;
  week_end: string;
  people_count: number;
  acquired_count: number | null;
  answered_at: string | null;
  editable?: boolean;
};
export type WhatsappWeekHistoryItem = Omit<WhatsappWeekReport, "id"> & {
  id: string | null;
  period_start?: string;
  editable: boolean;
};
export type WhatsappWeekHistory = { weeks: WhatsappWeekHistoryItem[]; next_page: number | null };
const route = "/api/private/psychologist/whatsapp-reports";
export const getWhatsappHistory = (page: number) =>
  handleReq<WhatsappWeekHistory>({
    ...callEndpoint({ route, query: { page } }),
    hideError: true,
  });
export const saveWhatsappWeek = (start: string, count: number) =>
  handleReq<WhatsappWeekReport>({
    ...callEndpoint({
      route: `${route}/week/:id`,
      params: { id: start },
      method: "PUT",
      body: { count },
    }),
    hideError: true,
  });
export const latestWhatsappReport = () =>
  handleReq<WhatsappWeekReport | null>({
    ...callEndpoint({ route: `${route}/latest` }),
    hideError: true,
  });
export const getWhatsappReport = (id: string) =>
  handleReq<WhatsappWeekReport>({
    ...callEndpoint({ route: `${route}/:id`, params: { id } }),
    hideError: true,
  });
export const openWhatsappReport = (id: string, automatic: boolean) =>
  handleReq<WhatsappWeekReport | null>({
    ...callEndpoint({
      route: `${route}/:id/${automatic ? "claim" : "open"}`,
      params: { id },
      method: "POST",
    }),
    hideError: true,
  });
export const answerWhatsappReport = (id: string, count: number) =>
  handleReq<WhatsappWeekReport>({
    ...callEndpoint({ route: `${route}/:id`, params: { id }, method: "PUT", body: { count } }),
    hideError: true,
  });

import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type FeedbackStatus = "new" | "reviewing" | "resolved";
export type FeedbackCategory = "unclassified" | "technical" | "suggestion";
export type Feedback = {
  id: string;
  description: string;
  status: FeedbackStatus;
  category: FeedbackCategory;
  created_at: string;
  updated_at: string;
  revision: number;
  user: { id: string; name: string; role: string };
  attachments: { id: string; size: number }[];
};
export type FeedbackDetail = Feedback & {
  internal_note: string;
  app_version: string | null;
  viewport: string | null;
};
export type FeedbackFilters = {
  page: number;
  q?: string;
  status?: string;
  category?: string;
  role?: string;
};
export type FeedbackPage = {
  items: Feedback[];
  total: number;
  page: number;
  pages: number;
  new_count: number;
};
export type FeedbackUpdate = Pick<
  FeedbackDetail,
  "revision" | "status" | "category" | "internal_note"
>;
const base = "/api/admin/private/feedback";
export const getFeedbacks = async (params: FeedbackFilters) =>
  resolveApiData((await adminApi.get<ApiResponse<FeedbackPage>>(base, { params })).data);
export const getFeedbackCount = async () =>
  resolveApiData((await adminApi.get<ApiResponse<{ new_count: number }>>(`${base}/count`)).data);
export const getFeedback = async (id: string) =>
  resolveApiData(
    (await adminApi.get<ApiResponse<FeedbackDetail>>(`${base}/${encodeURIComponent(id)}`)).data,
  );
export const updateFeedback = async (id: string, body: FeedbackUpdate) =>
  resolveApiData(
    (await adminApi.put<ApiResponse<{ id: string }>>(`${base}/${encodeURIComponent(id)}`, body))
      .data,
  );
export const loadFeedbackAttachment = async (id: string, attachmentId: string) =>
  (
    await adminApi.get<Blob>(
      `${base}/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}`,
      { responseType: "blob" },
    )
  ).data;

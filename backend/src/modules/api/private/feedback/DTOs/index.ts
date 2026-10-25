export type FeedbackInput = {
  request_id: string;
  description: string;
  app_version?: string;
  viewport?: string;
};
export type FeedbackQuery = {
  page?: number;
  q?: string;
  status?: "new" | "reviewing" | "resolved";
  category?: "unclassified" | "technical" | "suggestion";
  role?: "paciente" | "psicologo";
};
export type FeedbackUpdate = {
  revision: number;
  status: "new" | "reviewing" | "resolved";
  category: "unclassified" | "technical" | "suggestion";
  internal_note: string;
};

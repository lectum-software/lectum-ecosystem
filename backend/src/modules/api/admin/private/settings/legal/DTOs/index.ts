import type { LegalDraft, LegalEdit } from "@/modules/legal/contracts";
export type LegalAdminDTO = {
  admin: { id: string };
  p: { id: string };
  q: { page?: number };
  b: LegalDraft & LegalEdit & { review_confirmed: boolean };
};

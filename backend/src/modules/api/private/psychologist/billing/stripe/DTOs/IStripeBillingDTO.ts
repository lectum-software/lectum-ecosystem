import type { user } from "@/interfaces/objects";

export type IStripeBillingDTO = {
  auth: user;
  b: { request_key?: string; quote_revision?: string; intent?: "courtesy_renewal" };
  p: { id?: string };
  q: { intent?: "courtesy_renewal" };
};

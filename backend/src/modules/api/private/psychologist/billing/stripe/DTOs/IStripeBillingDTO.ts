import type { user } from "@/interfaces/objects";

export type IStripeBillingDTO = {
  auth: user;
  b: {
    request_key?: string;
    quote_revision?: string;
    intent?: "courtesy_renewal";
    flow_version?: "credit_only_v1";
    confirm_payment?: boolean;
  };
  p: { id?: string };
  q: { intent?: "courtesy_renewal" };
};

import type { user } from "@/interfaces/objects";

/** Local new-admission catalog only; not a provider-readiness or payment claim. */
export type PlanAdmissionOfferDTO = {
  status: "available" | "paused" | "unavailable";
  source: "versioned_offer" | "legacy_plan" | "none";
  amount_cents: number | null;
  currency: "BRL";
  interval: "month";
  revision: string | null;
};

export interface IPlansDTO {
  auth: user;
}

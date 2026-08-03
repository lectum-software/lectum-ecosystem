export type AdminSettingsSubscriptionPlanRecord = {
  active: boolean;
  createdAt: Date;
  gateway_plan_id: string | null;
  id: string;
  interval: string;
  name: string;
  price_cents: number;
  slug: string;
  updatedAt: Date;
};

export interface IAdminSettingsSubscriptionPlanRepository {
  findProfessionalPlan(): Promise<AdminSettingsSubscriptionPlanRecord | null>;
}

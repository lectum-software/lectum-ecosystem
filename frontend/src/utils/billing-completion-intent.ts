import type { SubscriptionPlanFeatures } from "@/api/generator/types/billing";

type CompletionIntent = {
  mode: "signup" | "upgrade";
  previousFeatures: SubscriptionPlanFeatures;
  createdAt: number;
};
const key = (userId: string) => `lectum:billing-completion:${userId}`;

// Presentation only: paid entitlement and registry status still come from the API.
export const rememberBillingCompletion = (
  userId: string,
  mode: CompletionIntent["mode"],
  previousFeatures: SubscriptionPlanFeatures,
) => {
  try {
    sessionStorage.setItem(
      key(userId),
      JSON.stringify({ mode, previousFeatures, createdAt: Date.now() }),
    );
  } catch {
    // Storage can be unavailable in private browsing.
  }
};

export const readBillingCompletion = (userId: string): CompletionIntent | null => {
  try {
    const value = JSON.parse(sessionStorage.getItem(key(userId)) ?? "null");
    if (
      !value ||
      !["signup", "upgrade"].includes(value.mode) ||
      !Number.isFinite(value.createdAt) ||
      Date.now() - value.createdAt > 24 * 60 * 60 * 1000 ||
      !value.previousFeatures ||
      typeof value.previousFeatures !== "object"
    )
      return null;
    return value;
  } catch {
    return null;
  }
};

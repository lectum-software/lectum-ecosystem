import type { professional_subscription } from "@/interfaces/objects";

type EffectiveSubscriptionCandidate = professional_subscription | null;

export type EffectiveBillingSubscriptionCandidates = {
  activeProfessional?: EffectiveSubscriptionCandidate;
  actionableGatewayProfessional?: EffectiveSubscriptionCandidate;
  activeFree?: EffectiveSubscriptionCandidate;
};

export const resolveEffectiveBillingSubscription = ({
  activeFree,
  activeProfessional,
  actionableGatewayProfessional,
}: EffectiveBillingSubscriptionCandidates): professional_subscription | null =>
  activeProfessional ?? actionableGatewayProfessional ?? activeFree ?? null;

import { error, msg } from "@/helpers/translate";
import type { ISubscriptionDTO } from "../DTOs/ISubscriptionDTO";
import { SubscriptionRepository } from "../repositories/SubscriptionRepository";

export default async (data: ISubscriptionDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new SubscriptionRepository();
  const profile = await repository.findProfileByUserId(data.auth.id!);

  if (!profile || profile.deleted) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  const [subscription, paymentMethod] = await Promise.all([
    repository.showSubscription(profile.id!),
    repository.showPaymentMethod(data.auth.id!),
  ]);
  const paymentHistory = await repository.showPaymentHistory(subscription);

  return {
    status: 200,
    ...msg("show", {}),
    data: {
      current: subscription,
      subscription,
      payment_method: paymentMethod,
      payment_history: paymentHistory,
    },
  };
};

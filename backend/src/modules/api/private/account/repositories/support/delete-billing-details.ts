import type { Prisma } from "@/external/generated/prisma/client";
import { markDeleted } from "./account-query";

export const deleteBillingDetails = async (
  tx: Prisma.TransactionClient,
  userId: string,
  now: Date,
) => {
  await tx.billing_address.updateMany({
    where: { user_id: userId, deleted: false },
    data: {
      ...markDeleted(now),
      city: "[deleted]",
      complement: null,
      district: "[deleted]",
      number: "[deleted]",
      state: "[deleted]",
      street: "[deleted]",
      zip: "[deleted]",
    },
  });
  await tx.payment_method.updateMany({
    where: { user_id: userId, deleted: false },
    data: {
      ...markDeleted(now),
      brand: null,
      exp_month: null,
      exp_year: null,
      gateway_token: "[deleted]",
      last4: null,
    },
  });
};

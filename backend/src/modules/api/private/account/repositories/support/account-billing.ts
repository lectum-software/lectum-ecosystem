import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";

export class AccountBillingConflictError extends Error {
  constructor() {
    super("ACCOUNT_BILLING_CONFLICT");
  }
}

export const hasOpenBillingOperation = async (userId: string): Promise<boolean> => {
  return Boolean(
    await prisma.billing_operation.findFirst({
      where: {
        user_id: userId,
        state: {
          in: ["reserved", "creating", "requires_confirmation", "processing", "review_required"],
        },
      },
      select: { id: true },
    }),
  );
};

export const assertNoBlockingAccountBilling = async (
  tx: Prisma.TransactionClient,
  userId: string,
) => {
  const profiles = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM psychologist_profiles WHERE user_id = ${userId} AND deleted = false FOR UPDATE`;
  const openOperation = await tx.billing_operation.findFirst({
    where: {
      user_id: userId,
      state: {
        in: ["reserved", "creating", "requires_confirmation", "processing", "review_required"],
      },
    },
    select: { id: true },
  });
  const external = profiles[0]
    ? await tx.professional_subscription.findFirst({
        where: {
          psychologist_id: profiles[0].id,
          deleted: false,
          AND: [
            {
              OR: [
                { status: { in: ["ativa", "inadimplente"] } },
                { status: "inativa", gateway_subscription_id: { not: null } },
              ],
            },
          ],
          OR: [
            { status: "inadimplente" },
            { gateway: { not: null } },
            { gateway_subscription_id: { not: null } },
            { source: { in: ["stripe", "mercadopago"] } },
          ],
        },
        select: { id: true },
      })
    : null;
  if (openOperation || external) throw new AccountBillingConflictError();
};

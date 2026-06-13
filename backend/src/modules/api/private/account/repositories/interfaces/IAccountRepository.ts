import type { Prisma } from "@/external/generated/prisma/client";
import type { professional_subscription, user } from "@/interfaces/objects";

export interface IAccountRepository {
  deleteTokens: (userId: string) => Promise<void>;
  deleteOwnAccount: (user: user) => Promise<void>;
  findBlockingSubscription: (userId: string) => Promise<professional_subscription | null>;
  findByEmail: (email: string) => Promise<user | null>;
  findById: (id: string) => Promise<user | null>;
  updateUserAndClearTokens: (userId: string, data: Prisma.userUpdateInput) => Promise<user>;
}

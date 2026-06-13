import type { Prisma } from "@/external/generated/prisma/client";
import type { user } from "@/interfaces/objects";

export interface IAccountRepository {
  deleteTokens: (userId: string) => Promise<void>;
  findByEmail: (email: string) => Promise<user | null>;
  findById: (id: string) => Promise<user | null>;
  updateUserAndClearTokens: (userId: string, data: Prisma.userUpdateInput) => Promise<user>;
}

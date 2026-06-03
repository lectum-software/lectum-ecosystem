import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/external/generated/prisma/client";
import { env } from "@/main/server/environment";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });

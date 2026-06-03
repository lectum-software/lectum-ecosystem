import type { PrismaClient } from "@/external/generated/prisma/client";
import { prisma } from "@/external/prisma/client";

export type ORM = PrismaClient;

export { prisma };
export default prisma;

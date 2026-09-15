import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { visitor_session } from "@/interfaces/objects";
import { withSerializableTransaction } from "@/utils/prisma-transaction";

export type OwnedVisitorSessionInput = {
  browser?: string | null;
  deviceType?: string;
  os?: string | null;
  sessionId: string;
  userId?: string | null;
  visitorId: string;
  viewportHeight?: number | null;
  viewportWidth?: number | null;
};

export const linkVisitorSessionsToUser = async (visitorId: string, userId: string) => {
  const result = await prisma.visitor_session.updateMany({
    data: { user_id: userId },
    where: {
      deleted: false,
      user_id: null,
      visitor_id: visitorId,
    },
  });

  return result.count;
};

export const upsertOwnedVisitorSession = async (
  input: OwnedVisitorSessionInput,
): Promise<visitor_session | null> => {
  return withSerializableTransaction(async (transaction) => {
    const where = {
      visitor_id_session_id: {
        session_id: input.sessionId,
        visitor_id: input.visitorId,
      },
    };
    const existing = await transaction.visitor_session.findUnique({ where });

    if (existing?.user_id && existing.user_id !== input.userId) return null;

    const now = new Date();
    const updateData: Prisma.visitor_sessionUpdateInput = {
      last_seen_at: now,
    };

    if (input.userId) updateData.user = { connect: { id: input.userId } };
    if (input.deviceType !== undefined) updateData.device_type = input.deviceType;
    if (input.os !== undefined) updateData.os = input.os;
    if (input.browser !== undefined) updateData.browser = input.browser;
    if (input.viewportWidth !== undefined) updateData.viewport_width = input.viewportWidth;
    if (input.viewportHeight !== undefined) updateData.viewport_height = input.viewportHeight;

    return transaction.visitor_session.upsert({
      create: {
        browser: input.browser ?? null,
        device_type: input.deviceType ?? "unknown",
        first_seen_at: now,
        last_seen_at: now,
        os: input.os ?? null,
        session_id: input.sessionId,
        user_id: input.userId ?? null,
        visitor_id: input.visitorId,
        viewport_height: input.viewportHeight ?? null,
        viewport_width: input.viewportWidth ?? null,
      },
      update: updateData,
      where,
    });
  });
};

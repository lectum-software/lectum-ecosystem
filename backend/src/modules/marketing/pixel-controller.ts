import type { Request, Response } from "express";
import { z } from "zod";
import { send } from "@/helpers/return";
import { msg } from "@/helpers/translate";
import prisma from "@/infra/database/prisma";
import { browserCookieName } from "./browser-cookie";
import { readMetaConfig } from "./meta-config";
import { readPixelReceipts } from "./pixel-receipts";

export async function pixelReceipts(req: Request, res: Response, userId: string | null) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const config = readMetaConfig();
    if (process.env.META_PIXEL_ENABLED !== "true" || !config.datasetId) throw new Error("disabled");
    const input = (
      userId
        ? z.object({}).strict()
        : z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).strict()
    ).parse(req.body);
    const token = userId ? req.cookies?.[browserCookieName] : "token" in input ? input.token : null;
    if (typeof token !== "string") throw new Error("unavailable");
    const events = await prisma.$transaction((tx) => readPixelReceipts(tx, { userId, token }), {
      isolationLevel: "RepeatableRead",
    });
    return send(res, {
      status: 200,
      ...msg("marketing_consent_saved"),
      data: { pixelId: config.datasetId, events },
    });
  } catch {
    return send(res, { status: 200, ...msg("marketing_consent_saved"), data: { events: [] } });
  }
}

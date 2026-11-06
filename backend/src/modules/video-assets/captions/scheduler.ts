import prisma from "@/infra/database/prisma";
import { getVideoStreamApiConfig } from "@/infra/video-stream";
import { automaticCaptionAction, automaticCaptionIds } from "./automation-policy";
import { ownedCaptionAction } from "./service";

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

export const runAutomaticCaptions = async () => {
  const ids = automaticCaptionIds();
  if (running || !ids.length || !getVideoStreamApiConfig()) return;
  running = true;
  try {
    // Reconcile persisted state so a restart does not lose a ready-video event.
    for (const id of ids) {
      if (!automaticCaptionIds().includes(id)) break;
      const asset = await prisma.video_asset.findFirst({
        where: {
          id,
          deleted: false,
          status: "ready",
          owner: { deleted: false, role: "psicologo" },
        },
        select: { owner_id: true, status: true },
      });
      if (!asset) continue;
      const caption = await prisma.video_caption.findUnique({ where: { asset_id: id } });
      const action = automaticCaptionAction(asset.status, caption);
      if (action) await ownedCaptionAction(id, asset.owner_id, action, undefined);
    }
  } catch {
    console.warn("[CAPTIONS] Automatic reconciliation unavailable.");
  } finally {
    running = false;
  }
};

export const startAutomaticCaptions = () => {
  if (timer || !automaticCaptionIds().length) return;
  timer = setInterval(() => void runAutomaticCaptions(), 60_000);
  timer.unref();
};

export const stopAutomaticCaptions = () => {
  if (timer) clearInterval(timer);
  timer = null;
};

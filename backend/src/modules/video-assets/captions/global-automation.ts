import prisma from "@/infra/database/prisma";
import { automaticCaptionCapacity, automaticCaptionsEnabled } from "./automation-policy";
import { allCaptionsEnabled } from "./policy";
import { ownedCaptionAction } from "./service";

const eligible = {
  deleted: false,
  status: "ready",
  provider: "cloudflare_stream",
  purpose: { in: ["community_post", "community_reply", "profile_presentation"] },
  duration_seconds: { gt: 0 },
  owner: { deleted: false, role: "psicologo" },
};

const activeCaptions = (now: number) => ({
  state: "inprogress",
  updated_at: { gte: new Date(now - 86_400_000) },
  asset: eligible,
});

export async function listCaptionSyncs(now = Date.now()) {
  const active = activeCaptions(now);
  return prisma.video_caption.findMany({
    where: { ...active, updated_at: { ...active.updated_at, lte: new Date(now - 60_000) } },
    select: { asset_id: true, asset: { select: { owner_id: true } } },
    orderBy: [{ updated_at: "asc" }, { asset_id: "asc" }],
    take: 10,
  });
}

export async function listCaptionStarts(now = Date.now()) {
  const capacity = automaticCaptionCapacity(
    await prisma.video_caption.count({ where: activeCaptions(now) }),
  );
  if (!capacity) return [];
  return prisma.video_asset.findMany({
    where: { ...eligible, caption: { is: null } },
    select: { id: true, owner_id: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: capacity,
  });
}

export async function runGlobalCaptions() {
  if (!automaticCaptionsEnabled() || !allCaptionsEnabled()) return;
  for (const caption of await listCaptionSyncs()) {
    if (!automaticCaptionsEnabled() || !allCaptionsEnabled()) return;
    const result = await ownedCaptionAction(
      caption.asset_id,
      caption.asset.owner_id,
      "sync",
      undefined,
    );
    if (result.status === 503) return;
  }
  for (const asset of await listCaptionStarts()) {
    if (!automaticCaptionsEnabled() || !allCaptionsEnabled()) return;
    // The existing unique caption claim prevents duplicate paid requests on restart/races.
    const result = await ownedCaptionAction(asset.id, asset.owner_id, "generate", undefined);
    if (result.status === 503) break;
  }
}

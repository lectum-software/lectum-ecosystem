import prisma from "@/infra/database/prisma";
import { videoAssetIdFromReference } from "@/infra/video-stream";
import { VideoAssetRepository } from "../repository";
import {
  captionCuesSchema,
  captionEditSchema,
  captionsEnabledFor,
  captionsFitDuration,
} from "./policy";
import { parseCaptionStatus, parseCaptionVtt, requestCaption } from "./provider";

export async function readCaptions(assetId: string) {
  if (!captionsEnabledFor(assetId)) return null;
  const record = await prisma.video_caption.findUnique({ where: { asset_id: assetId } });
  if (record?.state !== "ready") return null;
  const cues = captionCuesSchema.safeParse(record.cues);
  return cues.success
    ? {
        asset_id: assetId,
        language: "pt" as const,
        revision: record.revision,
        reviewed: Boolean(record.reviewed_at),
        cues: cues.data,
      }
    : null;
}

export async function readPublicCaptions(reference: string | null | undefined) {
  const id = videoAssetIdFromReference(reference);
  if (!id || !captionsEnabledFor(id)) return null;
  const repository = new VideoAssetRepository();
  const asset = await repository.findById(id);
  if (asset?.status !== "ready" || !(await repository.isPlaybackAuthorized(asset, null)))
    return null;
  const caption = await readCaptions(id);
  if (!caption) return null;
  const professional = await prisma.psychologist_profile.findFirst({
    where: { user_id: asset.owner_id, published: true, deleted: false },
    select: { professional_first_name: true, professional_last_name: true, crp: true },
  });
  return {
    ...caption,
    professional: professional
      ? {
          name:
            [professional.professional_first_name, professional.professional_last_name]
              .filter(Boolean)
              .join(" ") || "Psicólogo responsável",
          crp: professional.crp,
          profile_url: `/psicologos/${asset.owner_id}`,
        }
      : null,
  };
}

export async function ownedCaptionAction(
  id: string,
  ownerId: string,
  action: "read" | "save" | "generate" | "sync",
  body: unknown,
) {
  if (!captionsEnabledFor(id)) return { status: 404, data: null };
  const asset = await prisma.video_asset.findFirst({
    where: {
      id,
      owner_id: ownerId,
      deleted: false,
      status: "ready",
      owner: { deleted: false, role: "psicologo" },
    },
  });
  if (!asset) return { status: 404, data: null };
  const current = await prisma.video_caption.findUnique({ where: { asset_id: id } });
  if (action === "read")
    return {
      status: 200,
      data: { state: current?.state ?? "absent", caption: await readCaptions(id) },
    };
  if (action === "save") {
    const parsed = captionEditSchema.safeParse(body);
    if (!parsed.success || !captionsFitDuration(parsed.data.cues, asset.duration_seconds))
      return { status: 422, data: null };
    if (current?.state !== "ready") return { status: 409, data: null };
    const result = await prisma.video_caption.updateMany({
      where: { asset_id: id, revision: parsed.data.revision, state: "ready" },
      data: {
        cues: parsed.data.cues,
        reviewed_at: new Date(),
        revision: { increment: 1 },
      },
    });
    return result.count
      ? { status: 200, data: await readCaptions(id) }
      : { status: 409, data: null };
  }
  if (action === "generate") {
    // No retry after an uncertain POST: it may already have started a paid operation.
    if (current) return { status: 409, data: null };
    const lock = await prisma.video_caption.createMany({
      data: [{ asset_id: id }],
      skipDuplicates: true,
    });
    if (!lock.count) return { status: 409, data: null };
    try {
      await requestCaption(asset.provider_uid, "generate");
    } catch {
      return { status: 503, data: { state: "inprogress" } };
    }
    return { status: 202, data: { state: "inprogress" } };
  }
  if (current?.state !== "inprogress") return { status: 409, data: null };
  try {
    const state = parseCaptionStatus(await requestCaption(asset.provider_uid, "status"));
    if (state === "ready") {
      const cues = parseCaptionVtt(await requestCaption(asset.provider_uid, "vtt"));
      if (!captionsFitDuration(cues, asset.duration_seconds)) return { status: 422, data: null };
      await prisma.video_caption.updateMany({
        where: { asset_id: id, state: "inprogress", revision: current.revision },
        data: { state, cues, revision: { increment: 1 } },
      });
    } else if (state === "error") {
      await prisma.video_caption.updateMany({
        where: { asset_id: id, state: "inprogress" },
        data: { state },
      });
    }
    return { status: 200, data: { state, caption: await readCaptions(id) } };
  } catch {
    return { status: 503, data: null };
  }
}

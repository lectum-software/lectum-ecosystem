import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type { IPostRenderShareArtifactDTO } from "../../DTOs/IPostDTO";
import { PostRepository } from "../../repositories/PostRepository";
import { ensureCommunityActor, notFound } from "./post-support";
import { renderShareVideoWithChromium } from "./share-render/renderer";
import type { ShareRenderResult } from "./share-render/types";

type ShareArtifactRenderSuccess = Resolve & {
  data: ShareRenderResult;
  success: true;
};

const invalidRenderMedia = () => ({
  status: 422,
  ...error("post_share_artifact_render_media_invalid", {}),
});

const invalidRenderTarget = () => ({
  status: 403,
  ...error("post_share_artifact_render_target_invalid", {}),
});

const renderUnavailable = () => ({
  status: 503,
  ...error("post_share_artifact_render_unavailable", {}),
});

export const renderShareArtifact = async (
  data: IPostRenderShareArtifactDTO,
): Promise<Resolve | ShareArtifactRenderSuccess> => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const target = await repository.findShareRenderTarget({
    postId: data.p.id,
    replyId: data.p.replyId,
    userId: data.auth.id!,
  });

  if (target.kind === "not_found") return notFound();
  if (target.kind === "forbidden") return invalidRenderTarget();
  if (target.kind === "invalid_media") return invalidRenderMedia();
  if (target.kind === "invalid_target") return invalidRenderTarget();
  if (target.kind !== "ok") return renderUnavailable();

  try {
    return {
      status: 200,
      ...msg("post_share_artifact_rendered", {}),
      data: await renderShareVideoWithChromium(target.data),
    };
  } catch {
    return renderUnavailable();
  }
};

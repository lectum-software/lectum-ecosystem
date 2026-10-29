import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { ContentVideoCursorError } from "../repositories/support/content-video-cursor";
import { contentVideos as contentVideosService } from "./services/content-videos";

export const contentVideos = async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    return send(
      res,
      await contentVideosService(req as unknown as Parameters<typeof contentVideosService>[0]),
    );
  } catch (err) {
    if (err instanceof ContentVideoCursorError) {
      return send(res, {
        status: err.reason === "expired" ? 410 : err.reason === "capacity" ? 503 : 400,
        success: false,
        code: `CONTENT_VIDEO_CURSOR_${err.reason.toUpperCase()}`,
        error:
          err.reason === "expired"
            ? "A fila de vídeos expirou. Feche e abra o vídeo novamente."
            : "Não foi possível continuar esta fila de vídeos. Tente abri-la novamente.",
      });
    }
    return error500(res, "post_content_videos", err);
  }
};

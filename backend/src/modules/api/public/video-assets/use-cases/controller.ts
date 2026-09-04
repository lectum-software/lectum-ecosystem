import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { showPlayback } from "./services";

export const playback = async (req: Request, res: Response) => {
  try {
    return send(res, await showPlayback(req.p.id, req.auth?.id ?? null));
  } catch (err) {
    return error500(res, "video_asset_public_playback_show", err);
  }
};

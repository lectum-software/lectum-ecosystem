import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { playback as playbackService } from "./services";

export const playback = async (req: Request, res: Response) => {
  try {
    return send(res, await playbackService(req.p.id));
  } catch (err) {
    return error500(res, "admin_video_asset_playback_show", err);
  }
};

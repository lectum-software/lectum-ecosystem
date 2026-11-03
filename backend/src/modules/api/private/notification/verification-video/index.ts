import { Router } from "express";
import { error500, send } from "@/helpers/return";
import middlewares from "../../../middlewares";
import { getVerificationVideoStatus, markVerificationVideoWatched } from "./repository";

const routes = Router();
routes.use(middlewares);

routes.get("", async (req, res) => {
  try {
    return send(res, {
      status: 200,
      success: true,
      data: await getVerificationVideoStatus(req.auth.id!),
    });
  } catch (error) {
    return error500(res, "verification_video_status", error);
  }
});

routes.post("", async (req, res) => {
  try {
    return send(res, {
      status: 200,
      success: true,
      data: await markVerificationVideoWatched(req.auth.id!),
    });
  } catch (error) {
    return error500(res, "verification_video_watched", error);
  }
});

export default routes;

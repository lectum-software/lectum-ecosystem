import { json, Router } from "express";
import type { VideoJobControllerDependencies } from "./service.js";
import {
  deleteVideoJob,
  downloadVideoJobOutput,
  finishCompressionUpload,
  prepareCompressionUpload,
  showVideoJob,
  startSocialShareRenderJob,
} from "./service.js";
import { createVideoUploadMiddleware } from "./upload.js";

export const createVideoJobsRouter = (dependencies: VideoJobControllerDependencies) => {
  const router = Router();
  const upload = createVideoUploadMiddleware(dependencies.config);

  router.post(
    "/compress",
    prepareCompressionUpload(dependencies),
    upload,
    finishCompressionUpload(dependencies),
  );
  router.post(
    "/social-share",
    json({ limit: "16kb", strict: true }),
    startSocialShareRenderJob(dependencies),
  );
  router.get("/:id", showVideoJob(dependencies));
  router.get("/:id/output", downloadVideoJobOutput(dependencies));
  router.delete("/:id", deleteVideoJob(dependencies));

  return router;
};

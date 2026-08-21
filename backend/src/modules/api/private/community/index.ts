import { Router } from "express";
import multer from "@/config/multer";
import { UPLOAD_LIMITS } from "@/config/multer/limits";
import { createMultipartChunkMiddleware } from "@/config/multer/multipart-chunk";
import { PUBLIC_MULTIPART_CHUNK_BYTES } from "@/config/multer/public-multipart";
import { uploadConcurrencyMiddleware } from "@/config/multer/upload-concurrency";
import privateAuth from "@/modules/api/middlewares/_auth";
import {
  abortPostMediaMultipartUpload,
  authorizePostMediaUpload,
  completePostMediaMultipartUpload,
  createPost,
  feed,
  follow,
  index,
  initiatePostMediaMultipartUpload,
  posts,
  show,
  suggest,
  topMentors,
  unfollow,
  uploadPostMedia,
  uploadPostMediaMultipartPart,
} from "./use-cases/controller";
import {
  createPostValidator,
  feedValidator,
  indexValidator,
  membershipValidator,
  postMediaMultipartAbortValidator,
  postMediaMultipartCompleteValidator,
  postMediaMultipartInitiateValidator,
  postMediaMultipartPartValidator,
  postsValidator,
  showValidator,
  suggestionValidator,
  topMentorsValidator,
} from "./validator";

const routes = Router();
const postMediaMultipartChunkMiddleware = createMultipartChunkMiddleware({
  maxFileSizeMb: PUBLIC_MULTIPART_CHUNK_BYTES / (1024 * 1024),
  scope: "community_post_media",
});

routes.get("", indexValidator, index);
routes.get("/feed/posts", feedValidator, feed);
routes.get("/top-mentors", topMentorsValidator, topMentors);
routes.post("/suggestions", privateAuth, suggestionValidator, suggest);
routes.post("/:slug/members", privateAuth, membershipValidator, follow);
routes.delete("/:slug/members", privateAuth, membershipValidator, unfollow);
routes.post(
  "/:slug/posts/media/multipart/initiate",
  privateAuth,
  postMediaMultipartInitiateValidator,
  initiatePostMediaMultipartUpload,
);
routes.post(
  "/:slug/posts/media/multipart/part",
  privateAuth,
  uploadConcurrencyMiddleware,
  postMediaMultipartChunkMiddleware,
  postMediaMultipartPartValidator,
  uploadPostMediaMultipartPart,
);
routes.post(
  "/:slug/posts/media/multipart/complete",
  privateAuth,
  postMediaMultipartCompleteValidator,
  completePostMediaMultipartUpload,
);
routes.delete(
  "/:slug/posts/media/multipart",
  privateAuth,
  postMediaMultipartAbortValidator,
  abortPostMediaMultipartUpload,
);
routes.post(
  "/:slug/posts/media",
  privateAuth,
  showValidator,
  authorizePostMediaUpload,
  multer({
    single: "media",
    feature: "posts",
    allowed: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ],
    size: UPLOAD_LIMITS.community.postMediaMb,
  }),
  uploadPostMedia,
);
routes.post("/:slug/posts", privateAuth, createPostValidator, createPost);
routes.get("/:slug/posts", postsValidator, posts);
routes.get("/:slug", showValidator, show);

export default routes;

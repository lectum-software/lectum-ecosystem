import { Router } from "express";
import multer from "@/config/multer";
import privateAuth from "@/modules/api/middlewares/_auth";
import {
  authorizePostMediaUpload,
  createPost,
  feed,
  follow,
  index,
  posts,
  show,
  suggest,
  topMentors,
  unfollow,
  uploadPostMedia,
} from "./use-cases/controller";
import {
  createPostValidator,
  feedValidator,
  indexValidator,
  membershipValidator,
  postsValidator,
  showValidator,
  suggestionValidator,
  topMentorsValidator,
} from "./validator";

const routes = Router();

routes.get("", indexValidator, index);
routes.get("/feed/posts", feedValidator, feed);
routes.get("/top-mentors", topMentorsValidator, topMentors);
routes.post("/suggestions", privateAuth, suggestionValidator, suggest);
routes.post("/:slug/members", privateAuth, membershipValidator, follow);
routes.delete("/:slug/members", privateAuth, membershipValidator, unfollow);
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
    size: 50,
  }),
  uploadPostMedia,
);
routes.post("/:slug/posts", privateAuth, createPostValidator, createPost);
routes.get("/:slug/posts", postsValidator, posts);
routes.get("/:slug", showValidator, show);

export default routes;

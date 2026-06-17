import { Router } from "express";
import privateAuth from "@/modules/api/middlewares/_auth";
import {
  createPost,
  feed,
  follow,
  index,
  posts,
  show,
  suggest,
  topMentors,
  unfollow,
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
routes.post("/:slug/posts", privateAuth, createPostValidator, createPost);
routes.get("/:slug/posts", postsValidator, posts);
routes.get("/:slug", showValidator, show);

export default routes;

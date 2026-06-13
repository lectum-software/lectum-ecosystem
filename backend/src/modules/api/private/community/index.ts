import { Router } from "express";
import {
  createPost,
  feed,
  follow,
  index,
  posts,
  show,
  suggest,
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
} from "./validator";

const routes = Router();

routes.get("", indexValidator, index);
routes.get("/feed/posts", feedValidator, feed);
routes.post("/suggestions", suggestionValidator, suggest);
routes.post("/:slug/members", membershipValidator, follow);
routes.delete("/:slug/members", membershipValidator, unfollow);
routes.post("/:slug/posts", createPostValidator, createPost);
routes.get("/:slug/posts", postsValidator, posts);
routes.get("/:slug", showValidator, show);

export default routes;

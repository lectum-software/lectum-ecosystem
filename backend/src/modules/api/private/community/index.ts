import { Router } from "express";
import { createPost, feed, index, posts, suggest } from "./use-cases/controller";
import {
  createPostValidator,
  feedValidator,
  indexValidator,
  postsValidator,
  suggestionValidator,
} from "./validator";

const routes = Router();

routes.get("", indexValidator, index);
routes.get("/feed/posts", feedValidator, feed);
routes.post("/suggestions", suggestionValidator, suggest);
routes.post("/:slug/posts", createPostValidator, createPost);
routes.get("/:slug/posts", postsValidator, posts);

export default routes;

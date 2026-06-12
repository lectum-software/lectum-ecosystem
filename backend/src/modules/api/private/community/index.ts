import { Router } from "express";
import { index, posts, suggest } from "./use-cases/controller";
import { indexValidator, postsValidator, suggestionValidator } from "./validator";

const routes = Router();

routes.get("", indexValidator, index);
routes.post("/suggestions", suggestionValidator, suggest);
routes.get("/:slug/posts", postsValidator, posts);

export default routes;

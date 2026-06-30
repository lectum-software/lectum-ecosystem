import { type RequestHandler, Router } from "express";
import middlewares from "../../../middlewares/_auth";
import {
  contact,
  contactClick,
  index,
  posts,
  reviews,
  show,
  videoWatch,
  view,
} from "./use-cases/controller";
import validator, {
  contactValidator,
  profileListValidator,
  profileShowValidator,
  profileVideoWatchValidator,
} from "./validator";

const routes = Router();

const optionalAuth: RequestHandler = (req, res, next) => {
  if (!req.headers.authorization) return next();

  return middlewares(req, res, next);
};

routes.get(
  "",
  optionalAuth,
  (req, res, next) =>
    validator(req, res, (e: Error) => {
      if (!e) return next();
    }),
  index,
);
routes.post("/:id/contact", middlewares, contactValidator, contact);
routes.post("/:id/contact-click", middlewares, profileShowValidator, contactClick);
routes.post("/:id/view", optionalAuth, profileShowValidator, view);
routes.post("/:id/video-watch", optionalAuth, profileVideoWatchValidator, videoWatch);
routes.get("/:id/posts", optionalAuth, profileListValidator, posts);
routes.get("/:id/reviews", optionalAuth, profileListValidator, reviews);
routes.get("/:id", optionalAuth, profileShowValidator, show);

export default routes;

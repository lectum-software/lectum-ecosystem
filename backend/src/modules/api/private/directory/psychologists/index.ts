import { Router } from "express";
import middlewares from "../../../middlewares/_auth";
import { contact, index, posts, reviews, show } from "./use-cases/controller";
import validator, {
  contactValidator,
  profileListValidator,
  profileShowValidator,
} from "./validator";

const routes = Router();

routes.use(middlewares);

routes.get(
  "",
  (req, res, next) =>
    validator(req, res, (e: Error) => {
      if (!e) return next();
    }),
  index,
);
routes.post("/:id/contact", contactValidator, contact);
routes.get("/:id/posts", profileListValidator, posts);
routes.get("/:id/reviews", profileListValidator, reviews);
routes.get("/:id", profileShowValidator, show);

export default routes;

import { Router } from "express";
import {
  deleteGoogleIntent,
  destroy,
  email,
  logout,
  onboardingTips,
  password,
  security,
  updateTips,
} from "./use-cases/controller";
import {
  deleteGoogleIntentValidator,
  deleteValidator,
  emailValidator,
  onboardingTipsValidator,
  passwordValidator,
} from "./validator";

const routes = Router();

routes.get("/security", security);
routes.get("/tips", onboardingTips);
routes.post("/logout", logout);
routes.post("/delete/google-intent", deleteGoogleIntentValidator, deleteGoogleIntent);
routes.post("/delete", deleteValidator, destroy);
routes.put("/email", emailValidator, email);
routes.put("/password", passwordValidator, password);
routes.put("/tips", onboardingTipsValidator, updateTips);

export default routes;

import { Router } from "express";
import { z } from "zod";
import { campaignSchema } from "@/modules/api/public/marketing/attribution";
import { validator } from "@/utils/validator";
import { captureBrowser } from "./use-cases/browser";
import { captureCheckout } from "./use-cases/checkout";
import * as actions from "./use-cases/controller";
import * as v from "./validator";

const routes = Router();
routes.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
routes.get("/status", v.statusValidator, actions.status);
routes.post("/grant", v.grantValidator, actions.grant);
routes.post("/revoke", v.statusValidator, actions.revoke);
// Handler checks its feature gate before strictly validating its small payload.
routes.post("/browser", captureBrowser);
routes.post("/checkout", captureCheckout);
routes.post(
  "/touch",
  validator({
    body: [
      { key: "expected_revision", custom: z.number().int().nonnegative() },
      { key: "campaigns", custom: campaignSchema },
    ],
  }),
  actions.touch,
);
export default routes;

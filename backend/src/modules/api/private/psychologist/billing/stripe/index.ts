import { Router } from "express";
import * as controller from "./use-cases/controller";
import {
  cardValidator,
  checkoutValidator,
  configValidator,
  confirmValidator,
  measurementValidator,
} from "./validator";

const routes = Router();
routes.get("/checkout/:id/measurement", measurementValidator, controller.measurement);
routes.get("/config", configValidator, controller.config);
routes.post("/checkout", checkoutValidator, controller.checkout);
routes.post("/checkout/:id/confirm", confirmValidator, controller.checkoutConfirm);
routes.post("/payment-method", cardValidator, controller.paymentMethod);
routes.post("/payment-method/:id/confirm", confirmValidator, controller.paymentMethodConfirm);
export default routes;

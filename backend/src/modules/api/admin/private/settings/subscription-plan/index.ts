import { Router } from "express";
import {
  changeOffer,
  createPrice,
  linkOffer,
  operations,
  prices,
  resumePrice,
} from "./use-cases/catalog-controller";
import { show } from "./use-cases/controller";
import {
  catalogListValidator,
  changeOfferValidator,
  createPriceValidator,
  linkOfferValidator,
  resumePriceValidator,
  showValidator,
} from "./validator";

const routes = Router();

routes.get("/", showValidator, show);
routes.get("/prices", catalogListValidator, prices);
routes.get("/price-operations", catalogListValidator, operations);
routes.post("/prices", createPriceValidator, createPrice);
routes.post("/price-operations/:id/resume", resumePriceValidator, resumePrice);
routes.put("/offer", linkOfferValidator, linkOffer);
routes.patch("/offer", changeOfferValidator, changeOffer);

export default routes;

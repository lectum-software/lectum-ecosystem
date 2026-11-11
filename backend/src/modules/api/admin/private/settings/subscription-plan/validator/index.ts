import { validator } from "@/utils/validator";

export const showValidator = validator({});

export {
  catalogListValidator,
  changeOfferValidator,
  createPriceValidator,
  linkOfferValidator,
  resumePriceValidator,
} from "./price-management";

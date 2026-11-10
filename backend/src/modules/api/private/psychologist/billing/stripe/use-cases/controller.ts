import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { error } from "@/helpers/translate";
import { StripeGatewayError } from "@/modules/billing/payment-gateway/stripe-error";
import { StripeBillingError } from "@/modules/billing/stripe/policy";
import type { IStripeBillingDTO } from "../DTOs/IStripeBillingDTO";
import * as services from "./services";

type Service = (data: IStripeBillingDTO) => Promise<unknown>;
const controller =
  (service: Service, allowBillingIntentSecret = false) =>
  async (req: Request, res: Response) => {
    try {
      const data = await service(req as unknown as IStripeBillingDTO);
      return send(res, { status: 200, success: true, data, allowBillingIntentSecret });
    } catch (failure) {
      if (failure instanceof StripeBillingError)
        return send(res, { status: failure.status, ...error(failure.code, {}) });
      if (failure instanceof StripeGatewayError)
        return send(res, { status: 503, ...error("billing_gateway_config_error", {}) });
      return error500(res, "stripe_billing_operation", failure);
    }
  };

export const config = controller(services.config);
export const checkout = controller(services.checkout, true);
export const checkoutConfirm = controller(services.checkoutConfirm, true);
export const paymentMethod = controller(services.paymentMethod, true);
export const paymentMethodConfirm = controller(services.paymentMethodConfirm, true);

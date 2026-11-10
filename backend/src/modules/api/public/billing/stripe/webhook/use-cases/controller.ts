import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { error } from "@/helpers/translate";
import { StripeGatewayError } from "@/modules/billing/payment-gateway/stripe-error";
import { StripeBillingError } from "@/modules/billing/stripe/policy";
import { store as service } from "./services";

export const store = async (req: Request, res: Response) => {
  try {
    const data = await service({
      body: req.rawBody ?? Buffer.alloc(0),
      signature: req.headers["stripe-signature"],
    });
    return send(res, { status: 200, success: true, data });
  } catch (failure) {
    if (failure instanceof StripeBillingError)
      return send(res, { status: failure.status, ...error(failure.code, {}) });
    if (failure instanceof StripeGatewayError)
      return send(res, { status: 503, ...error("billing_gateway_config_error", {}) });
    // Failed durable receipt must not ACK; the provider may redeliver its signed event.
    return error500(res, "stripe_webhook_receipt", failure);
  }
};

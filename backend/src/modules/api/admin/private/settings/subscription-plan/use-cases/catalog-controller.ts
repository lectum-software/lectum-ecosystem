import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { StripeOfferError } from "@/modules/billing/catalog/offer-policy";
import { setCatalogOffer } from "@/modules/billing/catalog/offer-service";
import { CatalogError } from "@/modules/billing/catalog/policy";
import { createCatalogPrice, resumeCatalogPrice } from "@/modules/billing/catalog/price-operations";
import { listCatalogRecords } from "@/modules/billing/catalog/read-service";
import { StripeGatewayError } from "@/modules/billing/payment-gateway/stripe-error";

async function catalogResponse(res: Response, action: () => Promise<unknown>) {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    const data = await action();
    const pending =
      data &&
      typeof data === "object" &&
      "operation" in data &&
      data.operation &&
      typeof data.operation === "object" &&
      "status" in data.operation &&
      data.operation.status !== "completed";
    return send(res, { status: pending ? 202 : 200, ...msg("index", {}), data });
  } catch (cause) {
    if (cause instanceof CatalogError)
      return send(res, {
        status:
          cause.code === "catalog_actor_invalid"
            ? 403
            : cause.code === "catalog_operation_not_found"
              ? 404
              : cause.code === "catalog_conflict"
                ? 409
                : 400,
        ...error(cause.code, {}),
      });
    if (cause instanceof StripeOfferError)
      return send(res, { status: 409, ...error("catalog_publication_blocked", {}) });
    if (cause instanceof StripeGatewayError)
      return send(res, {
        status: 503,
        ...error(
          cause.details.diagnostic === "access_denied"
            ? "catalog_access_denied"
            : "catalog_provider_unavailable",
          {},
        ),
      });
    return error500(res, "admin_settings_price_management", cause);
  }
}
export const prices = (req: Request, res: Response) =>
  catalogResponse(res, () =>
    listCatalogRecords(req.admin.id, "prices", req.q?.cursor, req.q?.limit ?? 10),
  );
export const operations = (req: Request, res: Response) =>
  catalogResponse(res, () =>
    listCatalogRecords(req.admin.id, "operations", req.q?.cursor, req.q?.limit ?? 10),
  );
export const createPrice = (req: Request, res: Response) =>
  catalogResponse(res, () =>
    createCatalogPrice(req.admin.id, req.b.amount_cents, req.b.request_key),
  );
export const resumePrice = (req: Request, res: Response) =>
  catalogResponse(res, () => resumeCatalogPrice(req.p.id, req.admin.id));
export const linkOffer = (req: Request, res: Response) =>
  catalogResponse(res, () =>
    setCatalogOffer(req.admin.id, {
      price_version_id: req.b.price_version_id,
      expected_revision: req.b.expected_revision,
      confirm_new_adhesions_only: req.b.confirm_new_adhesions_only,
    }),
  );
export const changeOffer = (req: Request, res: Response) =>
  catalogResponse(res, () =>
    setCatalogOffer(req.admin.id, {
      enabled: req.b.enabled,
      expected_revision: req.b.expected_revision,
      confirm_publish: req.b.confirm_publish,
    }),
  );

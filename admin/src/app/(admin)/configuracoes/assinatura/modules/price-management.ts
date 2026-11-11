import { z } from "zod";
import type { AdminSubscriptionPlanSettings } from "@/api/req/settings";
import type {
  AdminPriceCreation,
  AdminPriceOperation,
} from "@/api/req/settings/subscription-prices";

// Parse decimal text directly into integer cents; no floating-point monetary rounding.
export const parseMonthlyPrice = (value: string): number | null => {
  const normalized = value.trim();
  if (!/^\d{1,6}(?:[,.]\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(/[,.]/);
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents >= 50 && cents <= 99_999_999 ? cents : null;
};
export const priceFormSchema = z.object({
  amount: z.string().refine((value) => parseMonthlyPrice(value) !== null, {
    message: "Use de 0,50 a 999999,99.",
  }),
});
export type PriceFormValues = z.infer<typeof priceFormSchema>;
export const publishFormSchema = z.object({
  confirmation: z
    .string()
    .refine((value) => value === "PUBLICAR", "Digite PUBLICAR para confirmar."),
});
export type PublishFormValues = { confirmation: string };
export type PendingPriceRequest = {
  request_key: string;
  amount_cents: number;
  operation_id?: string;
};
export const toPriceCreationInput = (request: PendingPriceRequest): AdminPriceCreation => ({
  amount_cents: request.amount_cents,
  request_key: request.request_key,
  confirm_new_adhesions_only: true,
});
export const parsePendingPriceRequest = (value: string | null): PendingPriceRequest | null => {
  if (!value) return null;
  try {
    const row: unknown = JSON.parse(value);
    const parsed = z
      .object({
        request_key: z.string().uuid(),
        amount_cents: z.number().int().min(50).max(99_999_999),
        operation_id: z.string().min(1).max(128).optional(),
      })
      .safeParse(row);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};
export const priceRequestStorageKey = (
  actorId: string | null | undefined,
  planId: string,
  mode: string | null | undefined,
) =>
  actorId &&
  /^[A-Za-z0-9_-]{1,128}$/.test(actorId) &&
  /^[A-Za-z0-9_-]{1,128}$/.test(planId) &&
  (mode === "test" || mode === "live")
    ? `lectum:admin-price-request:${actorId}:${planId}:${mode}`
    : null;
export const readPreservedPriceRequest = (value: string | null) => {
  const pending = parsePendingPriceRequest(value);
  return { pending, ready: value === null || pending !== null };
};
export type LoadedPriceRequest = {
  storageKey: string;
  pending: PendingPriceRequest | null;
  ready: boolean;
};
export const scopedPriceRequestState = (
  storageKey: string | null,
  loaded: LoadedPriceRequest | null,
) =>
  storageKey && loaded?.storageKey === storageKey
    ? { pending: loaded.pending, ready: loaded.ready }
    : { pending: null, ready: false };
/** Management scope is independent of the gateway selected for new sales and of SDK credentials. */
export const getPriceManagementContext = (settings: AdminSubscriptionPlanSettings) => {
  const checkout = settings.checkout;
  const catalog = settings.catalog;
  const validCatalog = catalog?.gateway === "stripe" && catalog.remote_readiness === "not_checked";
  const mode = catalog
    ? validCatalog
      ? catalog.mode
      : null
    : checkout?.gateway === "stripe"
      ? checkout.mode
      : null;
  const rawOffer = catalog ? (validCatalog ? catalog.offer : null) : checkout?.offer;
  const offer =
    rawOffer &&
    Number.isSafeInteger(rawOffer.revision) &&
    rawOffer.revision >= 1 &&
    typeof rawOffer.checkout_enabled === "boolean"
      ? rawOffer
      : null;
  const rawAmount = catalog ? catalog.offer?.amount_cents : checkout?.price?.amount_cents;
  const amountCents =
    typeof rawAmount === "number" &&
    Number.isSafeInteger(rawAmount) &&
    rawAmount >= 50 &&
    rawAmount <= 99_999_999
      ? rawAmount
      : null;
  const versionId = catalog ? catalog.offer?.price_version_id : checkout?.price?.version_id;
  const publishingReady = Boolean(
    (mode === "test" || mode === "live") &&
      offer &&
      amountCents !== null &&
      versionId &&
      checkout?.gateway === "stripe" &&
      (checkout.status === "configured" || checkout.status === "paused") &&
      checkout.collection_enabled &&
      checkout.reconciliation_enabled,
  );
  return { mode, offer, amountCents, publishingReady, revision: offer?.revision ?? 0 };
};
export const priceOperationLabel = (status: AdminPriceOperation["status"]) => {
  const labels = {
    pending: "Aguardando recuperação",
    processing: "Em processamento",
    completed: "Versão registrada",
    failed: "Operação não concluída",
    manual_review: "Revisão operacional necessária",
  };
  return Object.hasOwn(labels, status) ? labels[status] : "Situação indisponível";
};
export const priceOperationIsTerminal = (operation: AdminPriceOperation) =>
  operation.status === "completed" || (operation.status === "failed" && !operation.can_resume);

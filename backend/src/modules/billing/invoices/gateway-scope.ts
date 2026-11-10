import { isDisposableRuntime } from "@/utils/runtime-config";
import { isStripeRuntimeAllowed } from "../payment-gateway/stripe-runtime";

export type InvoiceGatewayScope =
  | { gateway: "mercadopago"; accountId: null; mode: "test" | "live" }
  | { gateway: "stripe"; accountId: string; mode: "test" | "live" };

const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

/** MP keeps its historical gates; Stripe is independently isolated, never enabled by MP env. */
export function invoiceGatewayScopes(mode: "test" | "live", env = process.env) {
  const scopes: InvoiceGatewayScope[] = [];
  try {
    const db = new URL(env.DATABASE_URL ?? "");
    const database = decodeURIComponent(db.pathname.slice(1));
    const postgres = ["postgres:", "postgresql:"].includes(db.protocol) && Boolean(database);
    const mp =
      mode === "live"
        ? postgres &&
          env.NODE_ENV === "production" &&
          env.MERCADO_PAGO_ENV === "production" &&
          new URL(env.BASE ?? "").origin === "https://api.lectum.com.br" &&
          !LOOPBACK.has(db.hostname) &&
          !/(homol|staging|(?:^|[_-])(dev|test|local)(?:[_-]|$))/i.test(database)
        : postgres &&
          isDisposableRuntime(env.NODE_ENV ?? "") &&
          env.MERCADO_PAGO_ENV === "sandbox" &&
          LOOPBACK.has(db.hostname) &&
          /(?:^|[_-])(dev|test|local)(?:[_-]|$)/.test(database) &&
          !/(prod|homol|staging)/i.test(database);
    if (mp) scopes.push({ gateway: "mercadopago", accountId: null, mode });
  } catch {
    // An invalid MP configuration must neither enable MP nor hide a valid independent Stripe scope.
  }
  if (
    env.STRIPE_ENV === mode &&
    isStripeRuntimeAllowed(mode, env) &&
    /^acct_[A-Za-z0-9]{1,100}$/.test(env.STRIPE_ACCOUNT_ID ?? "")
  )
    scopes.push({ gateway: "stripe", accountId: env.STRIPE_ACCOUNT_ID!, mode });
  return scopes;
}

export const invoiceScopeMatches = (
  scopes: InvoiceGatewayScope[],
  record: { gateway: string; account_id: string | null; mode: string | null },
  legacyJob = false,
) =>
  scopes.some(
    (scope) =>
      record.gateway === scope.gateway &&
      record.account_id === scope.accountId &&
      (record.mode === scope.mode ||
        (legacyJob && scope.gateway === "mercadopago" && record.mode === null)),
  );

export const invoiceScopeWhere = (scopes: InvoiceGatewayScope[], legacyJob = false) => ({
  OR: scopes.map((scope) => ({
    gateway: scope.gateway,
    account_id: scope.accountId,
    ...(legacyJob && scope.gateway === "mercadopago"
      ? { OR: [{ mode: scope.mode }, { mode: null }] }
      : { mode: scope.mode }),
  })),
});

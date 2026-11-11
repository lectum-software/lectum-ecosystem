import type { AdminSubscriptionCheckoutSetting } from "@/api/req/settings";

type OfferStatus = AdminSubscriptionCheckoutSetting["status"];
const statusCopy: Record<OfferStatus, { label: string; description: string; warning: boolean }> = {
  configured: {
    label: "Habilitada na configuração local",
    description:
      "A configuração local permite novas adesões. A disponibilidade do provedor não foi consultada nesta tela.",
    warning: false,
  },
  paused: {
    label: "Novas adesões pausadas",
    description:
      "As novas adesões estão pausadas na configuração local. Esta consulta não altera contratos ou benefícios. O estado do cadastro do plano é mostrado separadamente.",
    warning: true,
  },
  not_configured: {
    label: "Oferta não configurada",
    description:
      "A configuração local para novas adesões ainda não está completa. O valor do cadastro legado não substitui uma oferta válida.",
    warning: true,
  },
  invalid_configuration: {
    label: "Configuração indisponível",
    description:
      "Não foi possível confirmar uma configuração local válida para novas adesões. Solicite uma revisão operacional antes de anunciar o preço.",
    warning: true,
  },
  invalid_offer: {
    label: "Oferta precisa de revisão",
    description:
      "A oferta cadastrada não pôde ser validada. O preço não será apresentado como vigente até a configuração ser revisada.",
    warning: true,
  },
};

const legacyCopy = {
  label: "Oferta atual não informada",
  description:
    "Esta versão do serviço ainda não informa a oferta para novas adesões. O cadastro do plano abaixo não comprova o preço vigente do checkout.",
  warning: true,
};

export const formatOfferMoney = (cents: number, currency = "BRL") => {
  if (!Number.isSafeInteger(cents) || cents < 0 || !/^[A-Z]{3}$/.test(currency)) return null;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
  } catch {
    return null;
  }
};

export const formatOfferCadence = (interval: string, count = 1) => {
  const labels: Record<string, readonly [string, string]> = {
    day: ["dia", "dias"],
    week: ["semana", "semanas"],
    month: ["mês", "meses"],
    year: ["ano", "anos"],
  };
  if (!Object.hasOwn(labels, interval) || !Number.isSafeInteger(count) || count < 1) return null;
  const label = labels[interval];
  return count === 1 ? `/ ${label[0]}` : `a cada ${count} ${label[1]}`;
};

export const formatOfferDate = (value: string | null | undefined) => {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
};

export const getOfferPresentation = (checkout?: AdminSubscriptionCheckoutSetting) => {
  if (!checkout) return { ...legacyCopy, price: null, cadence: null };
  if (checkout.source !== "local_configuration" || checkout.remote_readiness !== "not_checked") {
    return { ...statusCopy.invalid_configuration, price: null, cadence: null };
  }
  const knownStatus = Object.hasOwn(statusCopy, checkout.status);
  const copy = knownStatus ? statusCopy[checkout.status] : statusCopy.invalid_configuration;
  const sourceMatches =
    (checkout.gateway === "stripe" && checkout.price?.source === "billing_price_version") ||
    (checkout.gateway === "mercadopago" && checkout.price?.source === "subscription_plan");
  const priceAllowed =
    checkout.source === "local_configuration" &&
    (checkout.status === "configured" || checkout.status === "paused") &&
    sourceMatches &&
    checkout.price !== null;
  const price =
    priceAllowed && checkout.price
      ? formatOfferMoney(checkout.price.amount_cents, checkout.price.currency)
      : null;
  const cadence =
    priceAllowed && checkout.price
      ? formatOfferCadence(checkout.price.interval, checkout.price.interval_count)
      : null;
  if (checkout.status === "configured" && (!price || !cadence)) {
    return { ...statusCopy.invalid_offer, price: null, cadence: null };
  }
  return {
    ...copy,
    price: price && cadence ? price : null,
    cadence: price && cadence ? cadence : null,
  };
};

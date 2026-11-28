export type PixelReceipt = {
  eventId: string;
  eventName:
    | "PageView"
    | "CompleteRegistration"
    | "Contact"
    | "forum_post"
    | "InitiateCheckout"
    | "Subscribe";
  params: Record<string, string | number>;
};

// Do not spread a response into fbq. Rebuild the allowlisted parameters.
export function pixelCommand(pixelId: string, receipt: PixelReceipt): readonly unknown[] | null {
  if (!/^\d{5,25}$/.test(pixelId) || !/^[a-f0-9]{64}$/.test(receipt.eventId)) return null;
  const params: Record<string, string | number> = {};
  switch (receipt.eventName) {
    case "CompleteRegistration":
      if (!["user", "professional"].includes(String(receipt.params.account_type))) return null;
      params.account_type = receipt.params.account_type;
      break;
    case "Subscribe":
      if (
        typeof receipt.params.value !== "number" ||
        !Number.isFinite(receipt.params.value) ||
        receipt.params.value <= 0 ||
        receipt.params.value > 1_000_000 ||
        receipt.params.currency !== "BRL"
      )
        return null;
      params.value = receipt.params.value;
      params.currency = "BRL";
      break;
    case "PageView":
    case "Contact":
    case "InitiateCheckout":
    case "forum_post":
      break;
    default:
      return null;
  }
  return [
    receipt.eventName === "forum_post" ? "trackSingleCustom" : "trackSingle",
    pixelId,
    receipt.eventName,
    params,
    { eventID: receipt.eventId },
  ];
}

// Full community URLs are authorized; credentials and arbitrary query values are not.
export function pixelLocationAllowed(href: string) {
  try {
    const url = new URL(href);
    return (
      url.protocol === "https:" &&
      ["lectum.com.br", "www.lectum.com.br"].includes(url.hostname) &&
      !url.port &&
      !url.username &&
      !url.password &&
      !url.hash &&
      ([
        "/",
        "/app",
        "/psicologos",
        "/comunidades",
        "/app/profissional/assinatura/pagamento",
      ].includes(url.pathname) ||
        /^\/comunidades\/[a-z0-9-]+$/.test(url.pathname)) &&
      [...url.searchParams.keys()].every((key) =>
        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"].includes(
          key,
        ),
      )
    );
  } catch {
    return false;
  }
}

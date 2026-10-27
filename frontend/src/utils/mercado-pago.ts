export const mercadoPagoPublicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY?.trim();
export const mercadoPagoEnvironment =
  process.env.NEXT_PUBLIC_MERCADO_PAGO_ENV?.trim().toLowerCase();

const sandboxPayerEmail = process.env.NEXT_PUBLIC_MERCADO_PAGO_SANDBOX_PAYER_EMAIL?.trim();
const isSandbox = mercadoPagoEnvironment === "sandbox";
const isProduction = ["prod", "production"].includes(mercadoPagoEnvironment || "");
const isAppPublicKey = mercadoPagoPublicKey?.startsWith("APP_USR-") ?? false;

export const isMercadoPagoPublicConfigurationValid = Boolean(
  mercadoPagoPublicKey && isAppPublicKey && ((isSandbox && sandboxPayerEmail) || isProduction),
);

export const resolveMercadoPagoPayerEmail = (authenticatedEmail: string) => {
  if (isSandbox) {
    return sandboxPayerEmail || "";
  }

  return authenticatedEmail.trim();
};

export const getMercadoPagoDeviceSessionId = (enabled = false): string | undefined => {
  if (enabled !== true || typeof window === "undefined") return undefined;

  try {
    const value = (window as Window & { MP_DEVICE_SESSION_ID?: unknown }).MP_DEVICE_SESSION_ID;
    if (
      typeof value !== "string" ||
      value.length === 0 ||
      value.length > 256 ||
      /[^A-Za-z0-9_-]/.test(value)
    ) {
      return undefined;
    }

    return value;
  } catch {
    // A coleta opcional do SDK não pode impedir o envio do cartão tokenizado.
    return undefined;
  }
};

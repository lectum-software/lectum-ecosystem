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

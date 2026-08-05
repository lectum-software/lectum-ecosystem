export const mercadoPagoPublicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY?.trim();
export const mercadoPagoEnvironment =
  process.env.NEXT_PUBLIC_MERCADO_PAGO_ENV?.trim().toLowerCase();

const sandboxPayerEmail = process.env.NEXT_PUBLIC_MERCADO_PAGO_SANDBOX_PAYER_EMAIL?.trim();
const isSandbox = mercadoPagoEnvironment === "sandbox";
const isProduction = ["prod", "production"].includes(mercadoPagoEnvironment || "");
const isTestPublicKey = mercadoPagoPublicKey?.startsWith("TEST-") ?? false;

export const isMercadoPagoPublicConfigurationValid = Boolean(
  mercadoPagoPublicKey && ((isSandbox && isTestPublicKey) || (isProduction && !isTestPublicKey)),
);

export const resolveMercadoPagoPayerEmail = (authenticatedEmail: string) => {
  if (isSandbox && sandboxPayerEmail) {
    return sandboxPayerEmail;
  }

  return authenticatedEmail.trim();
};

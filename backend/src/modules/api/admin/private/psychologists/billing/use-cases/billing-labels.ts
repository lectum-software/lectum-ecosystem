import type { AdminPsychologistBillingSubscription } from "../repositories/AdminPsychologistBillingRepository";

export const gatewayLabel = (subscription: AdminPsychologistBillingSubscription | null) => {
  const value = (subscription?.gateway || subscription?.source || "").toLowerCase();
  if (value.includes("mercadopago") || value.includes("mercado_pago")) return "Mercado Pago";

  return subscription?.gateway || null;
};

export const sourceLabel = (source?: string | null) => {
  if (source === "admin_grant") return "Cortesia administrativa";
  if (source === "mercadopago") return "Mercado Pago";
  if (source === "stripe") return "Stripe";
  if (source === "free_signup") return "Cadastro gratuito";
  if (source === "legacy") return "Legado";

  return source ?? null;
};

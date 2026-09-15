import type { user } from "@/interfaces/objects";

export interface ICheckoutDTO {
  auth: user;
  b: {
    card_token: string;
    brand?: string | null;
    intent?: "courtesy_renewal";
    last4?: string | null;
    payment_type_id: "credit_card" | "debit_card" | "prepaid_card";
  };
}

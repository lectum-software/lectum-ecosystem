import type { user } from "@/interfaces/objects";

export interface IPaymentMethodSessionDTO {
  auth: user;
  b: {
    card_token: string;
    payment_type_id: "credit_card" | "debit_card" | "prepaid_card";
    brand?: string | null;
    last4?: string | null;
    exp_month?: number | null;
    exp_year?: number | null;
  };
}

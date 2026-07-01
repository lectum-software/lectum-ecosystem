import type { user } from "@/interfaces/objects";

export interface ICheckoutDTO {
  auth: user;
  b: {
    card_token: string;
    payment_type_id: "credit_card" | "debit_card" | "prepaid_card";
  };
}

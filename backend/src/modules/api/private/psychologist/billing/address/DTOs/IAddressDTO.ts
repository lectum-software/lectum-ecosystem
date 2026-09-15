import type { user } from "@/interfaces/objects";

export interface IAddressDTO {
  auth: user;
  b: {
    zip: string;
    street: string;
    number: string;
    complement?: string | null;
    district: string;
    city: string;
    state: string;
  };
}

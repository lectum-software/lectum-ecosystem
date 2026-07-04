import type {
  billing_address,
  professional_subscription,
  psychologist_profile,
} from "@/interfaces/objects";
import type { IAddressDTO } from "../../DTOs/IAddressDTO";

export interface IAddressRepository {
  findProfileByUserId(userId: string): Promise<Pick<psychologist_profile, "id" | "deleted"> | null>;
  findActiveProfessionalSubscription(
    psychologistId: string,
  ): Promise<professional_subscription | null>;
  saveAddress(
    userId: string,
    psychologistProfileId: string,
    data: IAddressDTO["b"],
  ): Promise<billing_address>;
}

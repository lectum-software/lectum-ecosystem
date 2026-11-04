import type { user } from "@/api/generator/types";
import type { BillingAddressPayload } from "@/api/generator/types/billing";

export const getProfileBillingAddress = (
  profile: user["psychologist_profile"] | null | undefined,
): BillingAddressPayload => ({
  zip: (profile?.professional_address_zip ?? "").replace(/\D/g, ""),
  street: profile?.professional_address_street?.trim() ?? "",
  number: profile?.professional_address_number?.trim() ?? "",
  complement: profile?.professional_address_complement?.trim() ?? "",
  district: profile?.professional_address_district?.trim() ?? "",
  city: profile?.professional_address_city?.trim() ?? "",
  state: profile?.professional_address_state?.trim().toUpperCase() ?? "",
});

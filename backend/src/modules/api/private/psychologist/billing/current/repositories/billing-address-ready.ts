type Address = {
  zip: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
};

export const isBillingAddressReady = (address: Address | null) =>
  Boolean(
    address &&
      /^\d{5}-?\d{3}$/.test(address.zip.trim()) &&
      address.street.trim() &&
      address.number.trim() &&
      address.district.trim() &&
      address.city.trim() &&
      /^[A-Z]{2}$/.test(address.state.trim()),
  );

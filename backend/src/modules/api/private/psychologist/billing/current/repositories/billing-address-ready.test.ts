import assert from "node:assert/strict";
import test from "node:test";
import { isBillingAddressReady } from "./billing-address-ready";

const address = {
  zip: "01310100",
  street: "Avenida Paulista",
  number: "1000",
  district: "Bela Vista",
  city: "Sao Paulo",
  state: "SP",
};
test("only a complete saved billing address skips billing onboarding", () => {
  assert.equal(isBillingAddressReady(address), true);
  assert.equal(isBillingAddressReady(null), false);
  for (const field of Object.keys(address)) {
    assert.equal(isBillingAddressReady({ ...address, [field]: " " }), false, field);
  }
  assert.equal(isBillingAddressReady({ ...address, zip: "123" }), false);
  assert.equal(isBillingAddressReady({ ...address, zip: "01310-100" }), true);
});

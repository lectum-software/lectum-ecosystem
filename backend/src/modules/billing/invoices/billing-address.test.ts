import assert from "node:assert/strict";
import { test } from "node:test";
import { requireInvoiceBillingAddress, toSendNfAddress } from "./billing-address";
import { InvoiceError } from "./config";
import { invoiceRequestSchema } from "./contracts";

const address = {
  zip: "35503-590",
  street: "Rua de teste",
  number: "151",
  district: "Centro",
  city: "Divinopolis",
  state: "MG",
};

test("SendNF address maps neighborhood, normalizes ZIP and omits unsupported fields", () => {
  const result = toSendNfAddress({ ...address, complement: " Sala 101 ", user_id: "private" });
  assert.deepEqual(result, {
    zip: "35503590",
    street: address.street,
    number: "151",
    complement: "Sala 101",
    neighborhood: "Centro",
  });
  for (const complement of [undefined, null, "", " "])
    assert.equal(Object.hasOwn(toSendNfAddress({ ...address, complement }), "complement"), false);
  assert.throws(() => toSendNfAddress(null), InvoiceError);
});

test("provider request preserves address while stripping the internal billing snapshot", () => {
  const base = {
    company_id: "unit-company",
    reference: "unit-payment",
    taker: {
      document: "529.982.247-25",
      name: "Teste Unitario",
      email: "test@example.invalid",
      address: toSendNfAddress(address),
    },
    items: [{ description: "Assinatura de teste", unit_amount: 2990 }],
    billing_address: address,
  };
  const parsed = invoiceRequestSchema.parse(base);
  assert.deepEqual(parsed.taker.address, toSendNfAddress(address));
  assert.equal(Object.hasOwn(parsed, "billing_address"), false);
  for (const invalid of [{ zip: "123" }, { zip: "35503590", ibge_city_code: "abc" }])
    assert.equal(
      invoiceRequestSchema.safeParse({
        ...base,
        taker: { ...base.taker, address: invalid },
      }).success,
      false,
    );
  assert.ok(
    invoiceRequestSchema.safeParse({
      ...base,
      taker: { ...base.taker, address: { zip: "35503590" } },
    }).success,
  );
});

test("missing billing data stays retryable instead of authorizing an invoice", () => {
  for (const value of [
    null,
    undefined,
    {},
    ...Object.keys(address).map((key) => ({ ...address, [key]: " " })),
  ]) {
    assert.throws(
      () => requireInvoiceBillingAddress(value),
      (error: unknown) =>
        error instanceof InvoiceError &&
        error.code === "billing_address_incomplete" &&
        error.retryable,
    );
  }
});

test("completed billing address permits preparation without unrelated user data", () => {
  assert.deepEqual(requireInvoiceBillingAddress({ ...address, user_id: "private" }), {
    ...address,
    zip: "35503590",
  });
  assert.equal(requireInvoiceBillingAddress({ ...address, complement: null }).complement, null);
  assert.equal(requireInvoiceBillingAddress({ ...address, number: "S/N" }).number, "S/N");
});

test("invalid postal codes and states cannot pass as a complete billing address", () => {
  for (const value of [
    { ...address, zip: "123" },
    { ...address, state: "XX" },
  ])
    assert.throws(() => requireInvoiceBillingAddress(value), InvoiceError);
});

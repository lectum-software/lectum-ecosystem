import assert from "node:assert/strict";
import { test } from "node:test";
import {
  projectStripeCreditCardRequestHash,
  stripeCreditCardRequestHash,
  stripeIdempotencyKey,
} from "./stripe-idempotency";

const identity = { accountId: "acct_idempotency", mode: "test" as const };
const key = "lectum-credit-card-1aa54bf0e68425b0cd82be920a2e4f8c8f7dc8fcea5d0ac0650d958bf2da0a75";
const proof = "ca7ca28542994a43f39ac05b6451b54770609ec477c0672d787230046695487e";

test("existing card-assignment provider key remains byte-for-byte stable", () => {
  assert.equal(stripeIdempotencyKey(identity, "credit-card", "sub_assignment:pm_assignment"), key);
  assert.equal(stripeCreditCardRequestHash(identity, "sub_assignment", "pm_assignment"), proof);
  assert.equal(projectStripeCreditCardRequestHash(key), proof);
  assert.notEqual(proof, key);
});

test("assignment proof is isolated by account, mode, subscription and payment method", () => {
  for (const value of [
    stripeCreditCardRequestHash(
      { ...identity, accountId: "acct_other" },
      "sub_assignment",
      "pm_assignment",
    ),
    stripeCreditCardRequestHash({ ...identity, mode: "live" }, "sub_assignment", "pm_assignment"),
    stripeCreditCardRequestHash(identity, "sub_other", "pm_assignment"),
    stripeCreditCardRequestHash(identity, "sub_assignment", "pm_other"),
  ])
    assert.notEqual(value, proof);
});

test("only an exact strict known card-assignment key is projected; no trimming or coercion", () => {
  for (const value of [
    null,
    undefined,
    1,
    {},
    { idempotency_key: key },
    [key],
    "",
    proof,
    `${key} `,
    ` ${key}`,
    `${key}\n`,
    key.toUpperCase(),
    key.slice(0, -1),
    `${key}0`,
    key.replace("credit-card", "credit-setup"),
    key.replace("credit-card", "preapproval"),
    key.replace(/.$/, "g"),
  ])
    assert.equal(projectStripeCreditCardRequestHash(value), null);
});

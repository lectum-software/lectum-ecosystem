import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePositiveInteger } from "./runtime-config";

describe("parsePositiveInteger", () => {
  it("aceita inteiros positivos dentro do limite", () => {
    assert.equal(parsePositiveInteger("12", 5, { max: 20 }), 12);
  });

  it("usa o valor seguro para entradas vazias, fracionadas ou fora do limite", () => {
    assert.equal(parsePositiveInteger("", 5), 5);
    assert.equal(parsePositiveInteger("1.5", 5), 5);
    assert.equal(parsePositiveInteger("21", 5, { max: 20 }), 5);
  });
});

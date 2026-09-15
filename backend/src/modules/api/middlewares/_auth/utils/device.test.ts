import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDevice } from "./device";

describe("getDevice", () => {
  it("aceita somente identificadores limitados e normalizados", () => {
    assert.deepEqual(getDevice({ headers: { "x-device": "  device_123456  " } }), {
      id: "device_123456",
    });
  });

  it("rejeita valores curtos, arrays e caracteres de controle", () => {
    assert.equal(getDevice({ headers: { "x-device": "short" } }).err, "device_not_found");
    assert.equal(getDevice({ headers: { "x-device": ["device_123456"] } }).err, "device_not_found");
    assert.equal(getDevice({ headers: { "x-device": "device\n123456" } }).err, "device_not_found");
  });
});

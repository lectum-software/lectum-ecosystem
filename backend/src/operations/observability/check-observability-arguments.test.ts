import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseObservabilityCheckEnvironment } from "./check-observability-arguments";

describe("observability check arguments", () => {
  it("exige confirmação explícita do ambiente publicado", () => {
    assert.equal(parseObservabilityCheckEnvironment([]), undefined);
    assert.equal(parseObservabilityCheckEnvironment(["--confirm=development"]), undefined);
    assert.equal(parseObservabilityCheckEnvironment(["--confirm=homolog", "--extra"]), undefined);
    assert.equal(parseObservabilityCheckEnvironment(["--confirm=homolog"]), "homolog");
    assert.equal(parseObservabilityCheckEnvironment(["--confirm=production"]), "production");
  });
});

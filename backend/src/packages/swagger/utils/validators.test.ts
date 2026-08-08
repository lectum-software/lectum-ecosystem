import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { loadValidations } from "./validators";

test("carrega validator nomeado quando a rota usa o identificador gerado pelo CommonJS", async () => {
  const parameters = await loadValidations({
    validator: path.resolve("src/modules/api/private/patient/favorites/validator/index.ts"),
    middlewares: ["validator_1.indexValidator", "controller_1.index"],
  });

  assert.equal(parameters.length, 9);
  assert.deepEqual(
    parameters.map((parameter) => parameter.name),
    [
      "limit",
      "page",
      "search",
      "available_today",
      "accepts_insurance",
      "social_value",
      "discount_first_session",
      "more_experienced",
      "verified",
    ],
  );
  assert.ok(parameters.every((parameter) => parameter.in === "query"));
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repositorySource = readFileSync(join(__dirname, "ReviewRepository.ts"), "utf8");
const serviceSource = readFileSync(join(__dirname, "../use-cases/services.ts"), "utf8");

test("minhas avaliações mantém dados reais mesmo sem entitlement profissional", () => {
  assert.match(
    serviceSource,
    /const res = await repository\.index\(data, \{ canReceiveReviews \}\);/,
  );
  assert.doesNotMatch(serviceSource, /buildPreviewResponse/);
  assert.match(repositorySource, /data: items\.map\(toReviewItem\),/);
  assert.match(
    repositorySource,
    /mode: options\.canReceiveReviews === false \? "preview" : "full",/,
  );
  assert.match(repositorySource, /can_receive_reviews: options\.canReceiveReviews \?\? true,/);
});

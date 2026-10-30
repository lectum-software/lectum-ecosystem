import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const profileRepositorySource = readFileSync(join(__dirname, "ProfileRepository.ts"), "utf8");
const indexRepositorySource = readFileSync(join(__dirname, "IndexRepository.ts"), "utf8");

test("perfil publico preserva depoimentos no downgrade e usa contagem atual", () => {
  assert.match(profileRepositorySource, /const reviewsPubliclyVisible = true;/);
  assert.match(profileRepositorySource, /where: visibleTestimonialsWhere\(item\.id\)/);
  assert.match(profileRepositorySource, /rating_avg: 0,/);
  assert.match(profileRepositorySource, /rating_count: testimonialCount,/);
  assert.match(profileRepositorySource, /reviews_publicly_visible: reviewsPubliclyVisible,/);
  const reviews = profileRepositorySource.slice(profileRepositorySource.indexOf("async reviews("));
  assert.doesNotMatch(reviews, /subscriptions|activeProfessionalEntitlementWhere/);
  assert.match(reviews, /user: \{ active: true, deleted: false, role: "psicologo" \}/);
  assert.match(reviews, /visibleTestimonialsWhere\(data\.p\.id\)/);
  assert.match(reviews, /rating_count: count,/);
  assert.match(
    profileRepositorySource,
    /data: \[\],\s*summary: \{\s*rating_avg: 0,\s*rating_count: 0,/,
  );
});

test("listagem publica conta depoimentos em lote sem media nem gate pago", () => {
  assert.match(indexRepositorySource, /const reviewsPubliclyVisible = true;/);
  assert.match(indexRepositorySource, /rating_avg: 0,/);
  assert.match(indexRepositorySource, /rating_count: item\.rating_count,/);
  assert.match(indexRepositorySource, /reviews_publicly_visible: reviewsPubliclyVisible,/);
  assert.match(
    indexRepositorySource,
    /rankPsychologistCandidates\(candidates, viewerId \?\? null\)/,
  );
});

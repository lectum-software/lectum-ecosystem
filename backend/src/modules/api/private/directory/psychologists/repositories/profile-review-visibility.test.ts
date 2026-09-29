import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const profileRepositorySource = readFileSync(join(__dirname, "ProfileRepository.ts"), "utf8");
const indexRepositorySource = readFileSync(join(__dirname, "IndexRepository.ts"), "utf8");

test("perfil publico oculta métricas e lista de avaliações sem entitlement pago", () => {
  assert.match(
    profileRepositorySource,
    /const reviewsPubliclyVisible = profile\.subscriptions\.length > 0;/,
  );
  assert.match(
    profileRepositorySource,
    /const canExposeReviewMetrics = reviewsPubliclyVisible \|\| viewerId === item\.id;/,
  );
  assert.match(
    profileRepositorySource,
    /rating_avg: canExposeReviewMetrics \? profile\.rating_avg : 0,/,
  );
  assert.match(
    profileRepositorySource,
    /rating_count: canExposeReviewMetrics \? profile\.rating_count : 0,/,
  );
  assert.match(profileRepositorySource, /reviews_publicly_visible: reviewsPubliclyVisible,/);
  assert.match(
    profileRepositorySource,
    /subscriptions: \{\s*some: activeProfessionalEntitlementWhere\(\),\s*\}/,
  );
  assert.match(
    profileRepositorySource,
    /data: \[\],\s*summary: \{\s*rating_avg: 0,\s*rating_count: 0,/,
  );
});

test("listagem publica nao mostra nota real de perfis gratuitos", () => {
  assert.match(
    indexRepositorySource,
    /const reviewsPubliclyVisible = item\.subscriptions\.length > 0;/,
  );
  assert.match(
    indexRepositorySource,
    /rating_avg: reviewsPubliclyVisible \? item\.rating_avg : 0,/,
  );
  assert.match(
    indexRepositorySource,
    /rating_count: reviewsPubliclyVisible \? item\.rating_count : 0,/,
  );
  assert.match(indexRepositorySource, /reviews_publicly_visible: reviewsPubliclyVisible,/);
});

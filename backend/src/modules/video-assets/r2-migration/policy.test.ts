import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createR2MigrationIdentity,
  isR2MigrationAsset,
  legacyR2ObjectKeyFromReference,
  resolveR2MigrationTargetEnvironment,
} from "./policy";

describe("política da migração R2 para Stream", () => {
  it("extrai somente chaves R2 do prefixo permitido para a finalidade", () => {
    assert.equal(
      legacyR2ObjectKeyFromReference(
        "https://old-api.example/public/files/psychologist/video/video.mov",
        "profile_presentation",
      ),
      "psychologist/video/video.mov",
    );
    assert.equal(
      legacyR2ObjectKeyFromReference("/public/files/posts/media/video.mp4", "community_post"),
      "posts/media/video.mp4",
    );
    assert.equal(
      legacyR2ObjectKeyFromReference("/public/files/posts/media/video.mp4", "profile_presentation"),
      null,
    );
    assert.equal(
      legacyR2ObjectKeyFromReference(
        "/public/files/posts/media/video.mp4?token=secret",
        "community_reply",
      ),
      null,
    );
  });

  it("gera identidade determinística sem incluir referência pública", () => {
    const first = createR2MigrationIdentity(
      "community_post",
      "post_12345678",
      "posts/media/video.mp4",
    );
    const second = createR2MigrationIdentity(
      "community_post",
      "post_12345678",
      "posts/media/video.mp4",
    );

    assert.deepEqual(first, second);
    assert.match(first.assetId, /^r2m_[a-f0-9]{28}$/);
    assert.equal(first.migrationKey.length, 64);
    assert.doesNotMatch(JSON.stringify(first), /posts\/media/);
  });

  it("identifica somente ativos com origem de migração R2", () => {
    assert.equal(isR2MigrationAsset({ source_provider: "cloudflare_r2" }), true);
    assert.equal(isR2MigrationAsset({ source_provider: null }), false);
  });

  it("detecta homologação pelo domínio mesmo com NODE_ENV de imagem production", () => {
    assert.equal(
      resolveR2MigrationTargetEnvironment({
        BASE: "https://homolog-api.lectum.com.br",
        NODE_ENV: "production",
        WEB_URL: "https://homolog.lectum.com.br",
      }),
      "homolog",
    );
    assert.equal(
      resolveR2MigrationTargetEnvironment({
        BASE: "https://api.lectum.com.br",
        NODE_ENV: "production",
        WEB_URL: "https://lectum.com.br",
      }),
      "production",
    );
  });

  it("falha fechado quando sinais publicados se contradizem", () => {
    assert.equal(
      resolveR2MigrationTargetEnvironment({
        BASE: "https://homolog-api.lectum.com.br",
        SENTRY_ENVIRONMENT: "production",
      }),
      null,
    );
  });

  it("não confunde NODE_ENV da imagem com o ambiente de dados", () => {
    assert.equal(resolveR2MigrationTargetEnvironment({ NODE_ENV: "production" }), null);
    assert.equal(resolveR2MigrationTargetEnvironment({ SENTRY_ENVIRONMENT: "homolog" }), null);
    assert.equal(
      resolveR2MigrationTargetEnvironment({ BASE: "https://homolog.attacker.example" }),
      null,
    );
  });
});

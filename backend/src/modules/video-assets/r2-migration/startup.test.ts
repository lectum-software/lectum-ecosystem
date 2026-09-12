import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveR2ToStreamStartupMigrationMode,
  shouldRunR2ToStreamStartupMigration,
  summarizeR2ToStreamStartupMigration,
} from "./startup-policy";
import type { MigrationItemResult } from "./types";

const homologEnv = {
  BASE: "https://homolog-api.lectum.com.br",
  WEB_URL: "https://homolog.lectum.com.br",
};

const productionEnv = {
  BASE: "https://api.lectum.com.br",
  WEB_URL: "https://lectum.com.br",
};

describe("R2 to Stream startup migration policy", () => {
  it("roda automaticamente apenas em homologacao publicada", () => {
    assert.deepEqual(shouldRunR2ToStreamStartupMigration(homologEnv), {
      mode: "auto",
      run: true,
      targetEnvironment: "homolog",
    });
    assert.deepEqual(shouldRunR2ToStreamStartupMigration(productionEnv), {
      mode: "auto",
      run: false,
      targetEnvironment: "production",
    });
  });

  it("permite desabilitar a migracao de startup sem alterar deploy", () => {
    assert.deepEqual(
      shouldRunR2ToStreamStartupMigration({
        ...homologEnv,
        R2_TO_STREAM_STARTUP_MIGRATION: "false",
      }),
      {
        mode: "disabled",
        run: false,
        targetEnvironment: "homolog",
      },
    );
    assert.equal(resolveR2ToStreamStartupMigrationMode("valor-invalido"), "disabled");
  });

  it("exige opt-in explicito para producao", () => {
    assert.deepEqual(
      shouldRunR2ToStreamStartupMigration({
        ...productionEnv,
        R2_TO_STREAM_STARTUP_MIGRATION: "production",
      }),
      {
        mode: "production",
        run: true,
        targetEnvironment: "production",
      },
    );
  });

  it("resume resultados sem expor referencias de midia ou dados pessoais", () => {
    const results: MigrationItemResult[] = [
      { migrationRef: "abc", outcome: "migrated", purpose: "profile_presentation" },
      { migrationRef: "def", outcome: "processing", purpose: "community_post" },
      { migrationRef: "ghi", outcome: "skipped", purpose: "community_reply" },
    ];

    assert.deepEqual(summarizeR2ToStreamStartupMigration(results), {
      already_attached: 0,
      eligible: 0,
      failed: 0,
      migrated: 1,
      processing: 1,
      skipped: 1,
      total: 3,
    });
  });
});

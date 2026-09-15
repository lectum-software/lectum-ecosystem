import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseR2ToStreamArguments } from "./r2-to-stream-arguments";

describe("argumentos da migração R2 para Stream", () => {
  it("usa dry-run seguro e lote pequeno por padrão", () => {
    assert.deepEqual(parseR2ToStreamArguments([]), {
      apply: false,
      confirmEnvironment: null,
      limit: 5,
      pollIntervalMs: 10_000,
      purpose: "all",
      waitTimeoutMs: 1_800_000,
    });
  });

  it("aceita aplicação explicitamente confirmada", () => {
    assert.deepEqual(
      parseR2ToStreamArguments([
        "--",
        "--apply",
        "--confirm=homolog",
        "--limit",
        "2",
        "--purpose=community_post",
        "--wait-seconds=600",
      ]),
      {
        apply: true,
        confirmEnvironment: "homolog",
        limit: 2,
        pollIntervalMs: 10_000,
        purpose: "community_post",
        waitTimeoutMs: 600_000,
      },
    );
  });

  it("recusa modo ambíguo, flag destrutiva e limites excessivos", () => {
    assert.throws(() => parseR2ToStreamArguments(["--apply", "--dry-run"]));
    assert.throws(() => parseR2ToStreamArguments(["--delete-source"]));
    assert.throws(() => parseR2ToStreamArguments(["--limit=500"]));
    assert.throws(() => parseR2ToStreamArguments(["--limit"]));
    assert.throws(() => parseR2ToStreamArguments(["--purpose"]));
    assert.throws(() => parseR2ToStreamArguments(["--confirm=homolog"]));
  });
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

test("browser validation never probes dynamic code under CSP", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--disallow-code-generation-from-strings",
      "--input-type=module",
      "-e",
      `
    import assert from 'node:assert/strict';
    let probes = 0;
    globalThis.Function = new Proxy(globalThis.Function, {
      apply() { probes++; throw new Error('CSP'); },
      construct() { probes++; throw new Error('CSP'); }
    });
    await import('./src/utils/zod-csp.ts');
    const { z } = await import('zod');
    const schema = z.object({ email: z.email(), count: z.number().int().min(1) });
    assert.equal(schema.safeParse({email:'person@example.com', count:1}).success, true);
    assert.equal(schema.safeParse({email:'invalid', count:0}).success, false);
    assert.equal((await schema.safeParseAsync({email:'person@example.com', count:2})).success, true);
    assert.equal(probes, 0);
  `,
    ],
    { cwd: new URL("../", import.meta.url), encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const source = readFileSync(new URL("../src/instrumentation-client.ts", import.meta.url), "utf8");
  assert.ok(source.startsWith('import "./utils/zod-csp";'));
});

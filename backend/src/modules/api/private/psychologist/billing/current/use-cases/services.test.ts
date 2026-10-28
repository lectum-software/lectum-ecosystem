import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const source = readFileSync(join(__dirname, "services.ts"), "utf8");

test("billing current declares the dotted capability alongside the legacy capability", () => {
  // Source-contract guard only: no repository substitution or simulated billing endpoint.
  assert.match(
    source,
    /capabilities:\s*\{\s*device_session_id:\s*true,\s*device_session_id_dotted:\s*true\s*,?\s*\}/,
  );
});

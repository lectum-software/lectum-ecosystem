import assert from "node:assert/strict";
import test from "node:test";
import { parseAuditImageArgument, runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

test("manual runner requires one explicit local audit image", () => {
  assert.equal(
    parseAuditImageArgument(["--image=lectum-backend:audit-0.1.330"]),
    "lectum-backend:audit-0.1.330",
  );
  for (const args of [
    [],
    ["--image=lectum-backend:latest"],
    ["--image=registry.example.com/backend:audit-0.1.330"],
    ["--image=lectum-backend:audit-0.1.330", "--apply"],
    ["--image=lectum-backend:audit-0.1.330\n"],
    ["--image=lectum-backend:audit-0.1.330 --privileged"],
    ["--database-url=postgresql://example.com/published"],
  ]) {
    assert.throws(() => parseAuditImageArgument(args));
  }
});

test("invalid probe configuration is rejected before allocating local resources", async () => {
  const options = {
    args: ["--image=lectum-backend:audit-0.1.330"],
    name: "duration",
    probeUrl: new URL("./analytics-duration-probe.cjs", import.meta.url),
    expectedChecks: 8,
    successMarker: "DURATION_POSTGRES_OK",
  };
  for (const invalid of [
    { name: "../../published" },
    { name: "" },
    { name: "a".repeat(26) },
    { expectedChecks: 0 },
    { expectedChecks: Infinity },
    { expectedChecks: 1.5 },
    { successMarker: "OK\nFAIL" },
    { probeUrl: new URL("https://example.com/probe.cjs") },
    { args: [] },
  ]) {
    await assert.rejects(runIsolatedPostgresProbe({ ...options, ...invalid }));
  }
});

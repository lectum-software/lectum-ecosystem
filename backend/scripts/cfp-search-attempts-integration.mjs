// Manual only: the witness is not the366 contract and must be selected explicitly.
import assert from "node:assert/strict";
import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

const args = process.argv.slice(2);
const witness = args[0] === "--legacy-witness";
if (witness) args.shift();
if (witness) assert.deepEqual(args, ["--image=lectum-backend:audit-0.1.365"]);
await runIsolatedPostgresProbe({
  args,
  name: witness ? "cfp-witness" : "cfp-attempts",
  probeUrl: new URL("./cfp-search-attempts-probe.cjs", import.meta.url),
  expectedChecks: witness ? 3 : 20,
  successMarker: witness ? "CFP_LEGACY_WITNESS_OK" : "CFP_SEARCH_ATTEMPTS_OK",
}).catch(() => {
  console.error("ISOLATED_POSTGRES_RUNNER_INVALID");
  process.exitCode = 2;
});

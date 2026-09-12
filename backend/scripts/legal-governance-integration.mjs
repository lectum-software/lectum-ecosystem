// Manual: node backend/scripts/legal-governance-integration.mjs --image=lectum-backend:audit-VERSAO
// New feature: no baseline. Only the supplied immutable candidate and disposable PostgreSQL.
// No source overlays, host application env or external providers. HTTP stays on container loopback.
import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

await runIsolatedPostgresProbe({
  name: "legal-governance",
  probeUrl: new URL("./legal-governance-probe.cjs", import.meta.url),
  expectedChecks: 107,
  successMarker: "LEGAL_GOVERNANCE_POSTGRES_OK",
}).catch(() => {
  console.error("ISOLATED_POSTGRES_RUNNER_INVALID");
  process.exitCode = 2;
});

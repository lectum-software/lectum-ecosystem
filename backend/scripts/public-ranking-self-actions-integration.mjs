// Manual only: same real context contract on baseline and final immutable images.
import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

await runIsolatedPostgresProbe({
  name: "ranking-self",
  probeUrl: new URL("./public-ranking-self-actions-probe.cjs", import.meta.url),
  expectedChecks: 17,
  successMarker: "PUBLIC_RANKING_SELF_ACTIONS_OK",
}).catch(() => {
  console.error("ISOLATED_POSTGRES_RUNNER_INVALID");
  process.exitCode = 2;
});

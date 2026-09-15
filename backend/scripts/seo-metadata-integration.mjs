// Manual integration: immutable local image and disposable PostgreSQL; no source overlays.
import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

await runIsolatedPostgresProbe({
  name: "seo",
  probeUrl: new URL("./seo-metadata-probe.cjs", import.meta.url),
  expectedChecks: 18,
  successMarker: "SEO_METADATA_POSTGRES_OK",
}).catch(() => {
  console.error("ISOLATED_POSTGRES_RUNNER_INVALID");
  process.exitCode = 2;
});

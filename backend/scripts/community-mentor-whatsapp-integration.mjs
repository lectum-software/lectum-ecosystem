// Manual: imagem imutável + PostgreSQL descartável; sem app HTTP, provider ou env do host.
// node backend/scripts/community-mentor-whatsapp-integration.mjs --image=lectum-backend:audit-0.1.367
// O mesmo contrato deve falhar na baseline 0.1.366; não há expectativas relaxadas por versão.
import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

await runIsolatedPostgresProbe({
  name: "mentor-whatsapp",
  probeUrl: new URL("./community-mentor-whatsapp-probe.cjs", import.meta.url),
  expectedChecks: 31,
  successMarker: "COMMUNITY_MENTOR_WHATSAPP_POSTGRES_OK",
});

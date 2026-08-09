import "@/config/dotenv";

void import("@/main/server/bootstrap").catch(() => {
  console.error("[BOOT] Não foi possível iniciar o backend com segurança.");
  process.exitCode = 1;
});

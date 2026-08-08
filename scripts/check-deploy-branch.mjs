import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const currentBranch = execFileSync("git", ["branch", "--show-current"], {
  cwd: repositoryRoot,
  encoding: "utf8",
}).trim();

if (!currentBranch) {
  console.error("[deploy-branch] Push bloqueado: não foi possível identificar a branch atual.");
  process.exitCode = 1;
} else if (currentBranch === "main") {
  console.error(
    "[deploy-branch] Push direto em main bloqueado: ele publicaria produção automaticamente.",
  );
  console.error(
    "[deploy-branch] Mude para homolog, valide o deploy e promova por merge revisado para main.",
  );
  process.exitCode = 1;
} else {
  console.log(`[deploy-branch] OK: push permitido a partir de ${currentBranch}.`);
}

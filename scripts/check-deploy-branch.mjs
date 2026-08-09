import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { evaluateDeployPush } from "./deploy-branch-policy.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const currentBranch = execFileSync("git", ["branch", "--show-current"], {
  cwd: repositoryRoot,
  encoding: "utf8",
}).trim();

const stdinIsTTY = Boolean(process.stdin.isTTY);
let input = "";
if (!stdinIsTTY) {
  try {
    input = readFileSync(0, "utf8");
  } catch {
    input = "";
  }
}

const decision = evaluateDeployPush({ branch: currentBranch, input, stdinIsTTY });

if (decision.reason === "branch_unknown") {
  console.error("[deploy-branch] Push bloqueado: não foi possível identificar a branch atual.");
  process.exitCode = 1;
} else if (decision.reason === "source_branch") {
  const deploymentRisk =
    currentBranch === "main"
      ? "ela publicaria produção automaticamente"
      : "tasks e deploys do Lectum devem sair exclusivamente de homolog";

  console.error(`[deploy-branch] Push a partir de ${currentBranch} bloqueado: ${deploymentRisk}.`);
  console.error(
    "[deploy-branch] Mude para homolog, valide o deploy e promova por merge revisado para main.",
  );
  process.exitCode = 1;
} else if (decision.reason === "invalid_input") {
  console.error(
    "[deploy-branch] Push bloqueado: o hook não recebeu referências Git válidas e falhou de forma segura.",
  );
  process.exitCode = 1;
} else if (decision.reason === "target_branch") {
  console.error(
    "[deploy-branch] Push bloqueado: a branch homolog só pode atualizar homolog no remoto.",
  );
  console.error(
    "[deploy-branch] Produção recebe somente merge revisado depois do smoke de homologação.",
  );
  process.exitCode = 1;
} else if (decision.allowed) {
  console.log("[deploy-branch] OK: push permitido a partir de homolog.");
}

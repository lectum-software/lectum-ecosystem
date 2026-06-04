import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import net from "node:net";

const pnpmCommand = process.platform === "win32" ? "cmd.exe" : "pnpm";

function pnpmArgs(args) {
  if (process.platform !== "win32") return args;

  return ["/d", "/s", "/c", "pnpm.cmd", ...args];
}

function readEnvValue(filePath, key) {
  try {
    const content = readFileSync(filePath, "utf8");
    const line = content
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find((entry) => entry && !entry.startsWith("#") && entry.startsWith(`${key}=`));

    if (!line) return undefined;

    return line
      .slice(key.length + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  } catch {
    return undefined;
  }
}

function parsePort(value, fallback) {
  const parsed = Number(value ?? fallback);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65_535) {
    throw new Error(`Porta inválida: ${value}`);
  }

  return parsed;
}

function assertPortIsFree(port, label) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        reject(
          new Error(
            `${label} não pôde iniciar porque a porta ${port} já está em uso. ` +
              "Libere a porta ou ajuste FRONTEND_PORT/PORT antes de rodar pnpm dev.",
          ),
        );
        return;
      }

      reject(error);
    });

    server.once("listening", () => {
      server.close(resolve);
    });

    server.listen(port, "127.0.0.1");
  });
}

const backendPort = parsePort(process.env.PORT ?? readEnvValue("backend/.env", "PORT"), 3001);
const defaultFrontendPort = backendPort === 3000 ? 3002 : 3000;
const frontendPort = parsePort(process.env.FRONTEND_PORT, defaultFrontendPort);

const apps = [
  {
    name: "backend",
    args: ["--dir", "backend", "dev"],
    url: `http://localhost:${backendPort}`,
  },
  {
    name: "frontend",
    args: ["--dir", "frontend", "exec", "next", "dev", "--webpack", "--port", String(frontendPort)],
    url: `http://localhost:${frontendPort}`,
  },
];

const children = new Map();
let shuttingDown = false;

function stopAll(signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children.values()) {
    if (child.killed) continue;

    if (process.platform === "win32") {
      spawn("taskkill.exe", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore",
      });
      continue;
    }

    try {
      process.kill(-child.pid, signal);
    } catch {
      child.kill(signal);
    }
  }
}

await Promise.all([
  assertPortIsFree(backendPort, "Backend"),
  assertPortIsFree(frontendPort, "Frontend"),
]).catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});

console.log("Iniciando aplicações Lectum:");
for (const app of apps) {
  console.log(`- ${app.name}: ${app.url}`);
}
console.log("");

for (const app of apps) {
  const child = spawn(pnpmCommand, pnpmArgs(app.args), {
    detached: process.platform !== "win32",
    env: process.env,
    stdio: "inherit",
  });

  children.set(app.name, child);

  child.on("exit", (code, signal) => {
    children.delete(app.name);

    if (shuttingDown) {
      if (children.size === 0) process.exit(0);
      return;
    }

    const reason = signal ? `signal ${signal}` : `exit code ${code ?? 0}`;
    console.error(`\n[${app.name}] finalizou com ${reason}. Encerrando os demais processos...`);
    stopAll();
    process.exit(code ?? 1);
  });
}

process.on("SIGINT", () => stopAll("SIGINT"));
process.on("SIGTERM", () => stopAll("SIGTERM"));

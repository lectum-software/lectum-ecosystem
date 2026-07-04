import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer, request } from "node:http";
import net from "node:net";

const pnpmCommand = process.platform === "win32" ? "cmd.exe" : "pnpm";

function pnpmArgs(args) {
  if (process.platform !== "win32") return args;

  return ["/d", "/s", "/c", "pnpm.cmd", ...args];
}

function parseEnvFile(filePath) {
  const values = new Map();

  try {
    const content = readFileSync(filePath, "utf8");

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const separator = line.indexOf("=");
      if (separator <= 0) continue;

      const key = line.slice(0, separator).trim();
      const value = line
        .slice(separator + 1)
        .trim()
        .replace(/^["']|["']$/g, "");

      values.set(key, value);
    }
  } catch {
    // Arquivo .env local e opcional para o orquestrador.
  }

  return values;
}

const backendEnv = parseEnvFile("backend/.env");
const frontendEnv = parseEnvFile("frontend/.env");

function envValue(key) {
  return process.env[key] ?? backendEnv.get(key) ?? frontendEnv.get(key);
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function parsePort(value, fallback) {
  const parsed = Number(value ?? fallback);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65_535) {
    throw new Error(`Porta inválida: ${value}`);
  }

  return parsed;
}

function assertCommandExists(command, installHint, versionArgs = ["--version"]) {
  const result = spawnSync(command, versionArgs, {
    stdio: "ignore",
  });

  if (result.error?.code === "ENOENT") {
    throw new Error(`${command} não encontrado. ${installHint}`);
  }
}

function assertSupportedTunnelProvider(provider) {
  if (!["cloudflared", "ngrok"].includes(provider)) {
    throw new Error(`DEV_TUNNEL_PROVIDER inválido: ${provider}. Use cloudflared ou ngrok.`);
  }
}

function assertPortIsFree(port, label) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        reject(
          new Error(
            `${label} não pôde iniciar porque a porta ${port} já está em uso. ` +
              "Libere a porta ou ajuste PORT/FRONTEND_PORT/DEV_TUNNEL_PROXY_PORT antes de rodar pnpm dev.",
          ),
        );
        return;
      }

      reject(error);
    });

    server.once("listening", () => {
      server.close(resolve);
    });

    server.listen(port);
  });
}

function shouldRouteToBackend(url = "/") {
  return (
    url.startsWith("/api/") ||
    url.startsWith("/socket.io/") ||
    url.startsWith("/docs") ||
    url.startsWith("/swagger") ||
    url === "/logo.png"
  );
}

function proxyTargetFor(url, backendPort, frontendPort) {
  const port = shouldRouteToBackend(url) ? backendPort : frontendPort;

  return {
    hostname: "127.0.0.1",
    origin: `http://127.0.0.1:${port}`,
    port,
  };
}

function appendForwardedHeaders(headers, target, publicUrl) {
  const forwardedProto = publicUrl ? new URL(publicUrl).protocol.replace(":", "") : "https";

  return {
    ...headers,
    host: `127.0.0.1:${target.port}`,
    "x-forwarded-host": headers.host,
    "x-forwarded-proto": forwardedProto,
  };
}

function startProxyServer({ backendPort, frontendPort, proxyPort, publicUrl }) {
  const server = createServer((incoming, response) => {
    const target = proxyTargetFor(incoming.url, backendPort, frontendPort);
    const targetUrl = new URL(incoming.url || "/", target.origin);

    const proxyRequest = request(
      targetUrl,
      {
        headers: appendForwardedHeaders(incoming.headers, target, publicUrl),
        method: incoming.method,
      },
      (proxyResponse) => {
        response.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
        proxyResponse.pipe(response);
      },
    );

    proxyRequest.on("error", (error) => {
      response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      response.end(`Lectum dev tunnel proxy falhou: ${error.message}`);
    });

    incoming.pipe(proxyRequest);
  });

  server.on("upgrade", (incoming, socket, head) => {
    const target = proxyTargetFor(incoming.url, backendPort, frontendPort);
    const upstream = net.connect(target.port, target.hostname, () => {
      upstream.write(`${incoming.method} ${incoming.url} HTTP/${incoming.httpVersion}\r\n`);

      const headers = appendForwardedHeaders(incoming.headers, target, publicUrl);
      for (const [key, value] of Object.entries(headers)) {
        if (Array.isArray(value)) {
          for (const item of value) upstream.write(`${key}: ${item}\r\n`);
          continue;
        }

        if (value !== undefined) upstream.write(`${key}: ${value}\r\n`);
      }

      upstream.write("\r\n");
      if (head.length > 0) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });

    upstream.on("error", () => socket.destroy());
    socket.on("error", () => upstream.destroy());
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(proxyPort, "127.0.0.1", () => resolve(server));
  });
}

const backendPort = parsePort(envValue("PORT"), 3001);
const defaultFrontendPort = backendPort === 3000 ? 3002 : 3000;
const frontendPort = parsePort(envValue("FRONTEND_PORT"), defaultFrontendPort);
const tunnelEnabled = parseBoolean(envValue("DEV_TUNNEL_ENABLED"), false);
const tunnelProvider = (envValue("DEV_TUNNEL_PROVIDER") || "cloudflared").trim().toLowerCase();
const tunnelProxyPort = parsePort(envValue("DEV_TUNNEL_PROXY_PORT"), 3005);
const tunnelName = envValue("DEV_TUNNEL_NAME")?.trim();
const tunnelPublicUrl = envValue("DEV_TUNNEL_URL")?.trim();

const apps = [
  {
    name: "backend",
    command: pnpmCommand,
    commandArgs: pnpmArgs(["--dir", "backend", "dev"]),
    url: `http://localhost:${backendPort}`,
  },
  {
    name: "frontend",
    command: pnpmCommand,
    commandArgs: pnpmArgs([
      "--dir",
      "frontend",
      "exec",
      "next",
      "dev",
      "--webpack",
      "--port",
      String(frontendPort),
    ]),
    url: `http://localhost:${frontendPort}`,
  },
];

if (tunnelEnabled) {
  assertSupportedTunnelProvider(tunnelProvider);

  if (tunnelProvider === "cloudflared") {
    assertCommandExists(
      "cloudflared",
      "Instale o Cloudflare Tunnel CLI ou desative DEV_TUNNEL_ENABLED.",
    );
  }

  if (tunnelProvider === "ngrok") {
    assertCommandExists(
      "ngrok",
      "Instale o ngrok CLI, configure seu authtoken ou desative DEV_TUNNEL_ENABLED.",
      ["version"],
    );
  }
}

const children = new Map();
let proxyServer;
let shuttingDown = false;

function stopAll(signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;

  if (proxyServer) {
    proxyServer.close();
  }

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

const portChecks = [
  assertPortIsFree(backendPort, "Backend"),
  assertPortIsFree(frontendPort, "Frontend"),
];

if (tunnelEnabled) {
  portChecks.push(assertPortIsFree(tunnelProxyPort, "Dev tunnel proxy"));
}

await Promise.all(portChecks).catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});

if (tunnelEnabled) {
  proxyServer = await startProxyServer({
    backendPort,
    frontendPort,
    proxyPort: tunnelProxyPort,
    publicUrl: tunnelPublicUrl,
  });

  const tunnelApp =
    tunnelProvider === "ngrok"
      ? {
          name: "tunnel",
          command: "ngrok",
          commandArgs: [
            "http",
            `http://127.0.0.1:${tunnelProxyPort}`,
            ...(tunnelPublicUrl ? ["--url", tunnelPublicUrl] : []),
          ],
          url: tunnelPublicUrl || `ngrok dynamic -> http://127.0.0.1:${tunnelProxyPort}`,
        }
      : {
          name: "tunnel",
          command: "cloudflared",
          commandArgs: tunnelName
            ? ["tunnel", "run", tunnelName]
            : ["tunnel", "--url", `http://127.0.0.1:${tunnelProxyPort}`],
          url: tunnelPublicUrl || `quick tunnel -> http://127.0.0.1:${tunnelProxyPort}`,
        };

  apps.push(tunnelApp);
}

console.log("Iniciando aplicações Lectum:");
for (const app of apps) {
  console.log(`- ${app.name}: ${app.url}`);
}

if (tunnelEnabled) {
  console.log(`- tunnel proxy local: http://localhost:${tunnelProxyPort}`);
  console.log(`- tunnel provider: ${tunnelProvider}`);
  console.log(
    "  Rotas /api, /socket.io, /docs e /swagger seguem para o backend; demais rotas seguem para o frontend.",
  );

  if (tunnelProvider === "cloudflared" && tunnelName && !tunnelPublicUrl) {
    console.log(
      "  DEV_TUNNEL_NAME está configurado sem DEV_TUNNEL_URL; confira o hostname fixo no Cloudflare.",
    );
  }

  if (tunnelProvider === "cloudflared" && !tunnelName) {
    console.log("  Sem DEV_TUNNEL_NAME, o cloudflared criará uma URL temporária a cada execução.");
  }

  if (tunnelProvider === "ngrok" && tunnelName) {
    console.log("  DEV_TUNNEL_NAME é ignorado pelo provider ngrok; use DEV_TUNNEL_URL.");
  }

  if (tunnelProvider === "ngrok" && !tunnelPublicUrl) {
    console.log(
      "  Sem DEV_TUNNEL_URL, o ngrok escolherá a URL conforme a conta/configuração local.",
    );
  }
}
console.log("");

for (const app of apps) {
  const child = spawn(app.command, app.commandArgs, {
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

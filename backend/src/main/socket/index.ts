import http from "node:http";
import type { Express } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import io from "socket.io";
import { resolve } from "@/helpers/translate/resolve";
import prisma from "@/infra/database/prisma";
import { getJwtSecret } from "@/modules/api/middlewares/_auth/utils/jwt-secret";
import { getUserJwtTtlSeconds, parsePositiveInteger } from "@/utils/runtime-config";
import { readUserTokenFromCookieHeader } from "@/utils/user-auth-cookie";
import { emitAsync } from "./db/async";
import { connectedClients } from "./registry";
import { setSoc } from "./state";

export { aiSoc, setAiSoc, setSoc, soc } from "./state";

type SocketPayload = JwtPayload & {
  device_id?: string;
  id?: string;
  type?: string;
};

const SOCKET_AUTH_RECHECK_INTERVAL_MS = parsePositiveInteger(
  process.env.SOCKET_AUTH_RECHECK_INTERVAL_MS,
  60_000,
  { max: 10 * 60_000, min: 15_000 },
);

const validateSocketSession = async (token: string) => {
  const payload = jwt.verify(token, getJwtSecret(), {
    maxAge: getUserJwtTtlSeconds(),
  }) as SocketPayload;

  if (payload.type !== "user" || !payload.id || !payload.device_id) return null;

  const persistedToken = await prisma.user_token.findFirst({
    select: { id: true },
    where: {
      deleted: false,
      device_id: payload.device_id,
      token,
      user_id: payload.id,
      user: {
        active: true,
        deleted: false,
      },
    },
  });

  return persistedToken ? payload : null;
};

const normalizeOrigin = (value?: string | string[] | null) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;

  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
};

const shouldTrustForwardedOrigin = () => {
  const raw = process.env.TRUST_PROXY?.trim().toLowerCase();

  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
};

const resolveHandshakeOrigin = (headers: Record<string, string | string[] | undefined>) => {
  const explicitOrigin = normalizeOrigin(headers.origin);
  if (explicitOrigin) return explicitOrigin;
  if (!shouldTrustForwardedOrigin()) return null;

  const forwardedHost = Array.isArray(headers["x-forwarded-host"])
    ? headers["x-forwarded-host"][0]
    : headers["x-forwarded-host"];
  const forwardedProto = Array.isArray(headers["x-forwarded-proto"])
    ? headers["x-forwarded-proto"][0]
    : headers["x-forwarded-proto"];

  if (!forwardedHost || !forwardedProto) return null;

  return normalizeOrigin(`${forwardedProto}://${forwardedHost}`);
};

export const socket = (server: Express) => {
  const allowedOrigins = new Set(
    (process.env.WEB_URL?.split(",") || [])
      .map((origin) => normalizeOrigin(origin.trim()))
      .filter((origin): origin is string => Boolean(origin)),
  );

  const httpServer = http.createServer(server);

  const web = new io.Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: Array.from(allowedOrigins),
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    },
  });

  web.use(async (socket, next) => {
    const origin = resolveHandshakeOrigin(socket.handshake.headers);

    if (!origin || !allowedOrigins.has(origin)) {
      console.warn("[SOCKET] Origem não permitida", origin);
      return next(new Error(resolve("error.origin_not_allowed")));
    }
    const providedToken =
      socket.handshake.auth?.token ||
      socket.handshake.headers.authorization ||
      readUserTokenFromCookieHeader(socket.handshake.headers.cookie);
    const token =
      typeof providedToken === "string" && providedToken.startsWith("Bearer ")
        ? providedToken.slice("Bearer ".length)
        : providedToken;
    if (typeof token !== "string" || !token) {
      console.warn("[SOCKET] Token não fornecido");
      return next(new Error(resolve("error.token_not_provided")));
    }
    try {
      const payload = await validateSocketSession(token);
      if (!payload) return next(new Error(resolve("error.token_invalid")));

      (socket as any).authToken = token;
      (socket as any).payload = payload;
      return next();
    } catch (err: unknown) {
      console.warn("[SOCKET] Token inválido", {
        name: err instanceof Error ? err.name : "UnknownSocketAuthError",
      });
      return next(new Error(resolve("error.token_invalid")));
    }
  });

  setSoc(web);

  web.on("connection", (socket) => {
    let registered = false;
    let authCheckInProgress = false;
    const authTimer = setInterval(async () => {
      if (authCheckInProgress) return;

      authCheckInProgress = true;
      try {
        const token = (socket as any).authToken;
        if (typeof token !== "string" || !(await validateSocketSession(token))) {
          socket.disconnect(true);
        }
      } catch {
        socket.disconnect(true);
      } finally {
        authCheckInProgress = false;
      }
    }, SOCKET_AUTH_RECHECK_INTERVAL_MS);

    socket.on("client", () => {
      if (registered) return;

      const payload = (socket as any).payload as SocketPayload;
      if (!payload.id) {
        socket.disconnect(true);
        return;
      }

      registered = true;
      console.log("[SOCKET] Cliente conectado", {
        role: payload.type,
      });
      connectedClients.set(socket.id, { socket, data: payload });
      emitAsync(payload.id, payload.device_id);
      socket.emit("server", "Server response!");
    });

    socket.on("disconnect", () => {
      clearInterval(authTimer);
      const client = connectedClients.get(socket.id);
      if (client) {
        console.log("[SOCKET] Cliente desconectado");
        connectedClients.delete(socket.id);
      }
    });
  });

  return { web, httpServer, clients: connectedClients };
};

export { connectedClients as clients };

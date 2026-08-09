import http from "node:http";
import type { Express } from "express";
import jwt from "jsonwebtoken";
import io, { type DefaultEventsMap } from "socket.io";
import { resolve } from "@/helpers/translate/resolve";
import prisma from "@/infra/database/prisma";
import { getJwtSecret, JWT_ALGORITHM } from "@/modules/api/middlewares/_auth/utils/jwt-secret";
import { getPublicWebOrigins, parsePublicHttpOrigin } from "@/utils/public-origin";
import {
  getUserJwtTtlSeconds,
  isTrustProxyEnabled,
  parsePositiveInteger,
} from "@/utils/runtime-config";
import { toSafeErrorLog } from "@/utils/safe-error-log";
import { readUserTokenFromCookieHeader } from "@/utils/user-auth-cookie";
import { emitAsync } from "./db/async";
import { connectedClients } from "./registry";
import { type SocketPayload, type SocketSessionData, setSoc } from "./state";

export { aiSoc, setAiSoc, setSoc, soc } from "./state";

const SOCKET_AUTH_RECHECK_INTERVAL_MS = parsePositiveInteger(
  process.env.SOCKET_AUTH_RECHECK_INTERVAL_MS,
  60_000,
  { max: 10 * 60_000, min: 15_000 },
);

const validateSocketSession = async (token: string) => {
  const payload = jwt.verify(token, getJwtSecret(), {
    algorithms: [JWT_ALGORITHM],
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
  return parsePublicHttpOrigin(raw);
};

const resolveHandshakeOrigin = (headers: Record<string, string | string[] | undefined>) => {
  const explicitOrigin = normalizeOrigin(headers.origin);
  if (explicitOrigin) return explicitOrigin;
  if (!isTrustProxyEnabled()) return null;

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
  const allowedOrigins = new Set(getPublicWebOrigins());

  const httpServer = http.createServer(server);

  const web = new io.Server<
    DefaultEventsMap,
    DefaultEventsMap,
    DefaultEventsMap,
    SocketSessionData
  >(httpServer, {
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
      console.warn("[SOCKET] Origem não permitida", { has_origin: Boolean(origin) });
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

      socket.data.authToken = token;
      socket.data.payload = payload;
      return next();
    } catch (err: unknown) {
      console.warn("[SOCKET] Token inválido", toSafeErrorLog(err, "SocketAuthError"));
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
        const token = socket.data.authToken;
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

      const payload = socket.data.payload;
      if (!payload) {
        socket.disconnect(true);
        return;
      }
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

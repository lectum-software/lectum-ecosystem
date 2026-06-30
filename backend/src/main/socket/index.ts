import http from "node:http";
import type { Express } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { DefaultEventsMap } from "socket.io";
import io from "socket.io";
import { resolve } from "@/helpers/translate/resolve";
import { getJwtSecret } from "@/modules/api/middlewares/_auth/utils/jwt-secret";
import { emitAsync } from "./db/async";

type Soc = io.Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;

export let soc: Soc | null = null;
export let aiSoc: Soc | null = null;

const clients = new Map();

export const setSoc = (server: Soc) => {
  soc = server;
};

export const setAiSoc = (server: Soc) => {
  aiSoc = server;
};

export const socket = (server: Express) => {
  const allowedOrigins = process.env.WEB_URL?.split(",") || [];

  const httpServer = http.createServer({ maxHeaderSize: 12800000 }, server);

  const web = new io.Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    },
  });

  web.use((socket, next) => {
    const origin = socket.handshake.headers.origin;

    if (!origin || !allowedOrigins.includes(origin)) {
      console.warn("[SOCKET] Origem não permitida", origin);
      return next(new Error(resolve("error.origin_not_allowed")));
    }
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization;
    if (!token) {
      console.warn("[SOCKET] Token não fornecido");
      return next(new Error(resolve("error.token_not_provided")));
    }
    try {
      const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;

      (socket as any).payload = payload;
      return next();
    } catch (err: any) {
      console.warn("[SOCKET] Token inválido", err?.message);
      return next(new Error(resolve("error.token_invalid")));
    }
  });

  setSoc(web);

  web.on("connection", (socket) => {
    socket.on("client", () => {
      const payload = (socket as any).payload;

      console.log(`[SOCKET] Client connected: ${socket.id}`);
      clients.set(socket.id, { socket, data: payload });
      emitAsync(payload.id, payload.device_id);
      socket.emit("server", "Server response!");
    });

    socket.on("disconnect", () => {
      const client = clients.get(socket.id);
      if (client) {
        console.log(`[SOCKET] Client disconnected: ${socket.id}`);
        clients.delete(socket.id);
      }
    });
  });

  return { web, httpServer, clients };
};

export { clients };

import type { JwtPayload } from "jsonwebtoken";
import type io from "socket.io";
import type { DefaultEventsMap } from "socket.io";

export type SocketPayload = JwtPayload & {
  device_id?: string;
  id?: string;
  type?: string;
};

export type SocketSessionData = {
  authToken?: string;
  payload?: SocketPayload;
};

export type SocketServer = io.Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketSessionData
>;

export let soc: SocketServer | null = null;
export let aiSoc: SocketServer | null = null;

export const setSoc = (server: SocketServer) => {
  soc = server;
};

export const setAiSoc = (server: SocketServer) => {
  aiSoc = server;
};

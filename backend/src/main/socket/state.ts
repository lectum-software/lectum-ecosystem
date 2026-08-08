import type io from "socket.io";
import type { DefaultEventsMap } from "socket.io";

export type SocketServer = io.Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;

export let soc: SocketServer | null = null;
export let aiSoc: SocketServer | null = null;

export const setSoc = (server: SocketServer) => {
  soc = server;
};

export const setAiSoc = (server: SocketServer) => {
  aiSoc = server;
};

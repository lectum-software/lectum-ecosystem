import type { SocketState } from "./reducers";
import * as types from "./types";

export const update = (params: Partial<SocketState>) => {
  return {
    type: types.SOCKET_UPDATE,
    payload: params,
  };
};

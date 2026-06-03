import * as types from "./types";

export type SocketState = {
  connected: boolean;
  loading: boolean;
};

const initialState = {
  connected: false,
  loading: false,
};

type ModuleAction = {
  type: string;
  payload?: Partial<SocketState>;
};

export default function socketReducer(state: SocketState = initialState, action: ModuleAction) {
  switch (action.type) {
    case types.SOCKET_UPDATE:
      return {
        ...state,
        ...action.payload,
      };

    default:
      return state;
  }
}

import { combineReducers } from "@reduxjs/toolkit";
import socket from "./socket/reducers";
import user from "./user/reducers";

const rootReducer = combineReducers({
  user,
  socket,
});

export type RootReducerState = ReturnType<typeof rootReducer>;

export default rootReducer;

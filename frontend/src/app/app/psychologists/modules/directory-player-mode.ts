"use client";

import { useSyncExternalStore } from "react";
import { isDirectoryPlayerPoolEnabled } from "./directory-player-pool";

const subscribe = () => () => {};
const serverSnapshot = () => true;
const clientSnapshot = () => isDirectoryPlayerPoolEnabled(window.location.search);

export const useDirectoryPlayerPoolEnabled = () =>
  useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);

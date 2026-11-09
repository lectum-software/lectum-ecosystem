"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const serverSnapshot = () => false;
const clientSnapshot = () =>
  new URLSearchParams(window.location.search).get("directoryPlayer") === "pooled";

export const useDirectoryPlayerPoolEnabled = () =>
  useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);

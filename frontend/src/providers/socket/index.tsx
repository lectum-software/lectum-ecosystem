"use client";

import { useQueryClient } from "@tanstack/react-query";
//React && Hooks
import { useCallback, useEffect } from "react";
import io from "socket.io-client";
import keys from "@/api/cache/keys";
import { getBearerToken } from "@/hooks/cookies/token";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { update as updateSocket } from "@/store/modules/socket/actions";
import { update as updateUser } from "@/store/modules/user/actions";
import { fingerprint } from "@/utils/fingerprint";

//Global
const URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const socket = io(URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 500,
  withCredentials: true,
});

export const Provider = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user);
  const token = getBearerToken();
  const userId = user?.id;

  const clear = useCallback(() => {
    socket.removeAllListeners();
    socket.disconnect();
  }, []);

  const actions = useCallback(async () => {
    if (!userId) return;
    socket.auth = { ...socket.auth, token };
    socket.connect();

    socket.on("connect", async () => {
      dispatch(updateSocket({ connected: true, loading: false }));
      const currentDeviceId = await fingerprint();
      socket.emit("client", { id: userId, device_id: currentDeviceId });
    });

    socket.on("disconnect", () => {
      dispatch(updateSocket({ connected: false, loading: false }));
    });

    socket.on("connect_error", () => {
      dispatch(updateSocket({ connected: false, loading: false }));
    });

    socket.on("server", () => {});

    //Emits
    socket.on("user_hidrate", async (data, device_id) => {
      if (device_id) {
        const currentDeviceId = await fingerprint();
        if (currentDeviceId !== device_id) return;
      }

      dispatch(updateUser(data));
    });

    socket.on("notification", () => {
      queryClient.refetchQueries({ queryKey: keys.notification.root() });
    });
  }, [dispatch, token, userId, queryClient]);

  useEffect(() => {
    actions();

    return clear;
  }, [actions, clear]);

  return null;
};

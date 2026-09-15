"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { revokeSession } from "@/hooks/cookies/signout";
import { useAppDispatch } from "@/hooks/redux";
import * as userActions from "@/store/modules/user/actions";

const REDUX_PERSIST_KEY = "persist:lectum";

type AuthErrorSessionResetProps = {
  enabled: boolean;
};

export const AuthErrorSessionReset = ({ enabled }: AuthErrorSessionResetProps) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    const resetSession = async () => {
      try {
        await revokeSession();
        if (!active) return;

        try {
          window.localStorage.removeItem(REDUX_PERSIST_KEY);
        } catch {
          // A API já revogou a sessão; storage bloqueado não restaura a credencial.
        }
        dispatch(userActions.destroy());
      } catch {
        if (active) {
          toast.error(
            "Não foi possível encerrar a sessão anterior. Verifique sua conexão e tente novamente.",
          );
        }
      }
    };

    void resetSession();

    return () => {
      active = false;
    };
  }, [dispatch, enabled]);

  return null;
};

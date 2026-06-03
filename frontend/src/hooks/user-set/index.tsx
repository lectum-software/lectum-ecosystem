"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { user } from "@/api/generator/types";
import { useAppDispatch } from "@/hooks/redux";
import * as userActions from "@/store/modules/user/actions";

export const useUserSet = (redirect: string | null = "/dashboard") => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const setter = useCallback(
    (data: user) => {
      if (!data?.user_tokens?.[0]?.token) {
        router.replace(
          `/auth/error?error=${encodeURIComponent("Token de autenticacao nao retornado.")}`,
        );
        return;
      }

      dispatch(userActions.create(data));

      const callbackUrl = searchParams.get("callbackUrl");
      const target = callbackUrl || redirect;

      if (target) {
        router.replace(target);
      }
    },
    [dispatch, redirect, router, searchParams],
  );

  return { setter };
};

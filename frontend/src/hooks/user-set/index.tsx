"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { user } from "@/api/generator/types";
import { useAppDispatch } from "@/hooks/redux";
import * as userActions from "@/store/modules/user/actions";
import { resolveAuthRedirect } from "@/utils/auth-redirect";

type RedirectTarget = string | null | ((data: user) => string | null);
type UserSetOptions = {
  skipOnboardingRedirect?: boolean;
};

export const useUserSet = (
  redirect: RedirectTarget = "/dashboard",
  options: UserSetOptions = {},
) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const setter = useCallback(
    (data: user) => {
      if (!data?.id) {
        router.replace(
          `/auth/error?error=${encodeURIComponent("Sessão de autenticação não retornada.")}`,
        );
        return;
      }

      dispatch(userActions.create(data));

      const redirectTo = searchParams.get("redirectTo");
      const callbackUrl = searchParams.get("callbackUrl");
      const fallback = typeof redirect === "function" ? redirect(data) : redirect;
      const target = resolveAuthRedirect(data, redirectTo, fallback, callbackUrl, {
        skipOnboardingRedirect: options.skipOnboardingRedirect,
      });

      if (target) {
        router.replace(target);
      }
    },
    [dispatch, options.skipOnboardingRedirect, redirect, router, searchParams],
  );

  return { setter };
};

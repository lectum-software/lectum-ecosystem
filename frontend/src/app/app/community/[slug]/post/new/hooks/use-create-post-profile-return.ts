"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  consumeCreatePostProfileUpdated,
  readCreatePostProfileDraft,
  resolveCreatePostProfileReturnHref,
  saveCreatePostProfileDraft,
} from "../modules/create-post-support";
import type { CreateCommunityPostForm } from "../use-form";

type UseCreatePostProfileReturnOptions = {
  communitySlugFromQuery: string | null;
  form: Pick<UseFormReturn<CreateCommunityPostForm>, "getValues" | "reset">;
  routeSlug?: string | null;
  storedUserId: string | null;
};

export const useCreatePostProfileReturn = ({
  communitySlugFromQuery,
  form,
  routeSlug,
  storedUserId,
}: UseCreatePostProfileReturnOptions) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [profileUpdateConfirmationName, setProfileUpdateConfirmationName] = useState<string | null>(
    null,
  );
  const draftRestoreAttemptedRef = useRef(false);
  const currentHref = useMemo(() => {
    const query = searchParams.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  }, [pathname, searchParams]);
  const createPostReturnHref = useMemo(
    () =>
      resolveCreatePostProfileReturnHref({
        communitySlugFromQuery,
        currentHref,
        routeSlug,
      }),
    [communitySlugFromQuery, currentHref, routeSlug],
  );
  const profileEditHref = `/app/perfil/editar?returnTo=${encodeURIComponent(createPostReturnHref)}`;

  useEffect(() => {
    if (!storedUserId || draftRestoreAttemptedRef.current) return;

    draftRestoreAttemptedRef.current = true;
    const draft = readCreatePostProfileDraft({
      returnHref: createPostReturnHref,
      storage: window.sessionStorage,
      userId: storedUserId,
    });
    const confirmationName = consumeCreatePostProfileUpdated({
      returnHref: createPostReturnHref,
      storage: window.sessionStorage,
      userId: storedUserId,
    });
    if (!draft) return;

    form.reset(draft);
    queueMicrotask(() => {
      setProfileUpdateConfirmationName(confirmationName);
    });
  }, [createPostReturnHref, form, storedUserId]);

  const preserveDraftForProfileEdit = useCallback(() => {
    if (!storedUserId) return;

    saveCreatePostProfileDraft({
      returnHref: createPostReturnHref,
      storage: window.sessionStorage,
      userId: storedUserId,
      values: form.getValues(),
    });
  }, [createPostReturnHref, form, storedUserId]);

  return {
    continueAfterProfileUpdate: () => setProfileUpdateConfirmationName(null),
    preserveDraftForProfileEdit,
    profileEditHref,
    profileUpdateConfirmationName,
  };
};

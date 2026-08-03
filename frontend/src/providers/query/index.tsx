"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { isAdminViewAsReadOnlyError } from "@/utils/admin-view-as";

export const Provider = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 1000 * 60,
          },
          mutations: {
            retry: false,
          },
        },
        queryCache: new QueryCache({
          onError: (error) => {
            if (isAdminViewAsReadOnlyError(error)) return;

            if (error instanceof Error) {
              toast.error(error.message);
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (isAdminViewAsReadOnlyError(error)) return;

            if (error instanceof Error) {
              toast.error(error.message);
            }
          },
        }),
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

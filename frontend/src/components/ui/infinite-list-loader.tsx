"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/registry/new-york-v4/ui/button";
import { LoadingState } from "./loading-state";

export const InfiniteListLoader = ({
  hasNextPage,
  isFetching,
  isError,
  onLoadMore,
  onRetry,
  label,
}: {
  hasNextPage: boolean;
  isFetching: boolean;
  isError: boolean;
  onLoadMore: () => unknown;
  onRetry: () => unknown;
  label: string;
}) => {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasNextPage || isFetching || isError) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    let requested = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || requested) return;
        requested = true;
        onLoadMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, isError, onLoadMore]);

  if (!hasNextPage && !isFetching && !isError) return null;

  return (
    <div className="grid min-h-10 place-items-center gap-2 py-4" ref={sentinelRef}>
      {isFetching ? (
        <LoadingState label={label} />
      ) : isError ? (
        <>
          <p className="text-center text-sm text-muted" role="status">
            Não foi possível carregar os itens. Tente novamente.
          </p>
          <Button onClick={() => onRetry()} type="button" variant="outline">
            <RefreshCw className="h-4 w-4" aria-hidden />
            Tentar novamente
          </Button>
        </>
      ) : (
        <span className="sr-only">Carregamento automático</span>
      )}
    </div>
  );
};

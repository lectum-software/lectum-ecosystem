"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getPullToRefreshSnapshot,
  hasBlockingPullToRefreshSurface,
  isDocumentScrolledToTop,
  isPullToRefreshRouteEnabled,
  isScrollChainAtTop,
  PULL_TO_REFRESH_READY_OFFSET_PX,
  type PullToRefreshIndicatorStatus,
  shouldIgnorePullToRefreshTarget,
} from "@/utils/pull-to-refresh";

type PullToRefreshGesture = {
  progress: number;
  status: PullToRefreshIndicatorStatus;
  translateY: number;
};

const MOBILE_EXPERIENCE_QUERY = "(max-width: 767px), (pointer: coarse)";
const INTENT_DISTANCE_PX = 8;
const MINIMUM_REFRESH_FEEDBACK_MS = 520;
const DONE_FEEDBACK_MS = 420;
const PULL_TO_REFRESH_SCROLL_CLASS = "lectum-pull-to-refresh-enabled";

const IDLE_GESTURE: PullToRefreshGesture = {
  progress: 0,
  status: "idle",
  translateY: 0,
};

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

const updateRegisteredAppShell = async () => {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  } catch {
    // Falha de suporte do navegador nao deve bloquear o refresh da tela.
  }
};

export function PullToRefresh() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isMobileExperience, setIsMobileExperience] = useState(false);
  const [gesture, setGesture] = useState<PullToRefreshGesture>(IDLE_GESTURE);
  const isTrackingRef = useRef(false);
  const isPullingRef = useRef(false);
  const isReadyRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const mountedRef = useRef(false);
  const refreshResetTimerRef = useRef<number | null>(null);
  const startYRef = useRef(0);
  const targetRef = useRef<Element | null>(null);
  const routeEnabled = isPullToRefreshRouteEnabled(pathname);
  const isEnabled = isMobileExperience && routeEnabled;

  const setGestureSafely = useCallback((nextGesture: PullToRefreshGesture) => {
    if (!mountedRef.current) return;

    setGesture(nextGesture);
  }, []);

  const clearResetTimer = useCallback(() => {
    if (refreshResetTimerRef.current === null) return;

    window.clearTimeout(refreshResetTimerRef.current);
    refreshResetTimerRef.current = null;
  }, []);

  const resetTracking = useCallback(() => {
    isTrackingRef.current = false;
    isPullingRef.current = false;
    isReadyRef.current = false;
    startYRef.current = 0;
    targetRef.current = null;
  }, []);

  const resetGesture = useCallback(() => {
    resetTracking();

    if (!isRefreshingRef.current) {
      setGestureSafely(IDLE_GESTURE);
    }
  }, [resetTracking, setGestureSafely]);

  const refreshCurrentView = useCallback(async () => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    clearResetTimer();
    resetTracking();
    setGestureSafely({
      progress: 1,
      status: "refreshing",
      translateY: PULL_TO_REFRESH_READY_OFFSET_PX,
    });

    const startedAt = performance.now();

    try {
      router.refresh();
      await Promise.allSettled([
        queryClient.invalidateQueries({ refetchType: "active" }),
        updateRegisteredAppShell(),
      ]);

      const elapsed = performance.now() - startedAt;
      if (elapsed < MINIMUM_REFRESH_FEEDBACK_MS) {
        await wait(MINIMUM_REFRESH_FEEDBACK_MS - elapsed);
      }

      setGestureSafely({
        progress: 1,
        status: "done",
        translateY: PULL_TO_REFRESH_READY_OFFSET_PX,
      });
    } finally {
      isRefreshingRef.current = false;
      refreshResetTimerRef.current = window.setTimeout(() => {
        refreshResetTimerRef.current = null;
        setGestureSafely(IDLE_GESTURE);
      }, DONE_FEEDBACK_MS);
    }
  }, [clearResetTimer, queryClient, resetTracking, router, setGestureSafely]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      clearResetTimer();
    };
  }, [clearResetTimer]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_EXPERIENCE_QUERY);
    const mediaQueryWithLegacyListeners = mediaQuery as MediaQueryList & {
      addListener?: (listener: () => void) => void;
      removeListener?: (listener: () => void) => void;
    };
    const syncMobileExperience = () => {
      setIsMobileExperience(mediaQuery.matches);
    };

    syncMobileExperience();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncMobileExperience);
    } else {
      mediaQueryWithLegacyListeners.addListener?.(syncMobileExperience);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", syncMobileExperience);
      } else {
        mediaQueryWithLegacyListeners.removeListener?.(syncMobileExperience);
      }
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle(PULL_TO_REFRESH_SCROLL_CLASS, isMobileExperience);
    document.body.classList.toggle(PULL_TO_REFRESH_SCROLL_CLASS, isMobileExperience);

    return () => {
      document.documentElement.classList.remove(PULL_TO_REFRESH_SCROLL_CLASS);
      document.body.classList.remove(PULL_TO_REFRESH_SCROLL_CLASS);
    };
  }, [isMobileExperience]);

  useEffect(() => {
    if (!isEnabled) {
      resetGesture();
      return;
    }

    const handleTouchStart = (event: TouchEvent) => {
      if (isRefreshingRef.current) return;
      if (event.touches.length !== 1) return;
      if (!isDocumentScrolledToTop()) return;
      if (shouldIgnorePullToRefreshTarget(event.target)) return;
      if (hasBlockingPullToRefreshSurface()) return;

      const target = event.target;
      if (!(target instanceof Element) || !isScrollChainAtTop(target)) return;

      clearResetTimer();
      isTrackingRef.current = true;
      isPullingRef.current = false;
      isReadyRef.current = false;
      startYRef.current = event.touches[0]?.clientY ?? 0;
      targetRef.current = target;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isTrackingRef.current || event.touches.length !== 1) return;

      const target = targetRef.current;
      if (!target || !isDocumentScrolledToTop() || !isScrollChainAtTop(target)) {
        resetGesture();
        return;
      }

      const pullDistance = (event.touches[0]?.clientY ?? 0) - startYRef.current;

      if (pullDistance <= 0) {
        resetGesture();
        return;
      }

      if (!isPullingRef.current && pullDistance < INTENT_DISTANCE_PX) return;

      if (event.cancelable) {
        event.preventDefault();
      }

      isPullingRef.current = true;

      const snapshot = getPullToRefreshSnapshot(pullDistance);
      isReadyRef.current = snapshot.status === "ready";

      setGestureSafely({
        progress: snapshot.progress,
        status: snapshot.status,
        translateY: snapshot.translateY,
      });
    };

    const handleTouchEnd = () => {
      const shouldRefresh = isPullingRef.current && isReadyRef.current && !isRefreshingRef.current;

      resetTracking();

      if (shouldRefresh) {
        void refreshCurrentView();
        return;
      }

      setGestureSafely(IDLE_GESTURE);
    };

    const handleTouchCancel = () => {
      resetGesture();
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchCancel);
      resetTracking();
    };
  }, [
    clearResetTimer,
    isEnabled,
    refreshCurrentView,
    resetGesture,
    resetTracking,
    setGestureSafely,
  ]);

  if (gesture.status === "idle") return null;

  const label =
    gesture.status === "refreshing"
      ? "Atualizando..."
      : gesture.status === "done"
        ? "Atualizado"
        : gesture.status === "ready"
          ? "Solte para atualizar"
          : "Puxe para atualizar";

  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 z-[65] flex items-center gap-2 rounded-full border border-border bg-surface/95 px-3 py-2 text-sm font-bold text-foreground opacity-100 shadow-lectum-soft backdrop-blur transition-[opacity,transform] duration-150 ease-out supports-[backdrop-filter]:bg-surface/85",
        gesture.status === "done" ? "text-primary" : undefined,
      )}
      role="status"
      style={{
        transform: `translate3d(-50%, ${gesture.translateY}px, 0) scale(${0.96 + gesture.progress * 0.04})`,
      }}
    >
      <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-primary">
        <RefreshCw
          aria-hidden="true"
          className={cn(
            "h-4 w-4 transition-transform duration-150 ease-out",
            gesture.status === "refreshing" ? "animate-spin motion-reduce:animate-none" : undefined,
          )}
          style={{
            transform:
              gesture.status === "pulling" || gesture.status === "ready"
                ? `rotate(${Math.round(gesture.progress * 180)}deg)`
                : undefined,
          }}
        />
      </span>
      <span>{label}</span>
    </div>
  );
}

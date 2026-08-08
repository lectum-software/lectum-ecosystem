"use client";

import { useEffect, useMemo, useState } from "react";
import { getSafeApiErrorMessage } from "@/api/errors";
import { DEFAULT_NAV_BAR_HEIGHT } from "./onboarding";

export const resolveDirectoryErrorMessage = (error: unknown) => {
  const rawMessage = getSafeApiErrorMessage(error, "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para consultar psicólogos.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar ao serviço agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar a listagem de psicólogos.";
};

export const useViewportMetrics = () => {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 390 : window.innerWidth,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => {
      setWidth(window.innerWidth);
    };

    onResize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return useMemo(() => {
    const effectiveWidth = Math.min(width, 430);
    const isDesktop = width >= 1024;
    const isCompact = effectiveWidth <= 390;
    const isTiny = effectiveWidth < 360;
    const actionHitSize = isTiny ? 40 : 44;
    const actionButtonSize = isTiny ? 30 : 32;
    const actionPrimaryButtonSize = isTiny ? 34 : 36;

    return {
      actionButtonSize,
      actionAvatarSize: actionButtonSize,
      actionGap: isCompact ? 4 : 6,
      actionHitSize,
      actionIconSize: isTiny ? 14 : 15,
      actionPrimaryButtonSize,
      actionRightPadding: isTiny ? 12 : 16,
      actionRailWidth: actionHitSize,
      actionStandaloneIconSize: isTiny ? 18 : 20,
      availableBadgeTextSize: isTiny ? 10 : 11,
      bioBottomOffset: isDesktop ? 24 : 8,
      ratingIconSize: isCompact ? 9 : 10,
      ratingLineHeight: 13,
      ratingTextSize: 10,
      bioLineHeight: 17,
      bioSize: 12,
      filterButtonSize: isCompact ? 40 : 42,
      horizontalPadding: isCompact ? 16 : 20,
      isDesktopLayout: isDesktop,
      navBarHeight: isDesktop ? 0 : DEFAULT_NAV_BAR_HEIGHT,
      searchHeight: isCompact ? 42 : 46,
      searchRightGap: isCompact ? 62 : 74,
      searchTop: isCompact ? 36 : 40,
      subtitleSize: isCompact ? 11 : 12,
      textColumnGap: isTiny ? 8 : 10,
      titleLineHeight: isTiny || isCompact ? 21 : 22,
      titleSize: isTiny || isCompact ? 17 : 18,
      verifiedBadgeSize: isTiny ? 12 : 14,
    };
  }, [width]);
};

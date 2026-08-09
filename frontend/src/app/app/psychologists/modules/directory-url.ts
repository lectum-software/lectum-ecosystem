import type { DisplayMode } from "@/api/req/analytics";
import { getCurrentAnalyticsPath } from "@/utils/analytics-path";
import type { PsychologistsFilterForm } from "../use-form";
import type { NavigatorWithStandalone } from "./onboarding";
import { normalizeFormValues } from "./profile-format";

export const getDisplayMode = (): DisplayMode => {
  if (typeof window === "undefined") return "unknown";

  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return "fullscreen";
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return "minimal-ui";
  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  ) {
    return "standalone";
  }
  if (window.matchMedia("(display-mode: browser)").matches) return "browser";

  return "unknown";
};

export const currentAnalyticsPath = getCurrentAnalyticsPath;

export const resetVideoElementToStart = (video: HTMLVideoElement) => {
  video.pause();

  if (video.currentTime === 0) return;

  try {
    video.currentTime = 0;
  } catch {
    // Alguns browsers podem negar seek antes de metadata suficiente; o proximo load mantem o inicio.
  }
};

export const getPageFromParams = (params: URLSearchParams) => {
  const parsed = Number(params.get("page") || "1");

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
};

export const readFiltersFromParams = (params: URLSearchParams): PsychologistsFilterForm => {
  return normalizeFormValues({
    search: params.get("search") || "",
    specialty: params.get("specialty"),
    service: params.get("service"),
    modality: params.get("modality"),
    approach: params.get("approach"),
    target_audience: params.get("target_audience"),
    state: params.get("state"),
    city: params.get("city"),
    gender: params.get("gender"),
    race_color: params.get("race_color"),
    religion: params.get("religion"),
    language: params.get("language"),
    more_experienced: params.get("more_experienced") === "true",
    discount_first_session: params.get("discount_first_session") === "true",
    accepts_insurance: params.get("accepts_insurance") === "true",
    social_value: params.get("social_value") === "true",
    available_today: params.get("available_today") === "true",
    verified: params.get("verified") === "true",
  });
};

export const buildFiltersParams = (values: PsychologistsFilterForm, page = 1) => {
  const normalized = normalizeFormValues(values);
  const next = new URLSearchParams();

  if (normalized.search?.trim()) next.set("search", normalized.search.trim());
  if (normalized.specialty) next.set("specialty", normalized.specialty);
  if (normalized.service) next.set("service", normalized.service);
  if (normalized.modality) next.set("modality", normalized.modality);
  if (normalized.approach) next.set("approach", normalized.approach);
  if (normalized.target_audience) next.set("target_audience", normalized.target_audience);
  if (normalized.state) next.set("state", normalized.state);
  if (normalized.city) next.set("city", normalized.city);
  if (normalized.gender) next.set("gender", normalized.gender);
  if (normalized.race_color) next.set("race_color", normalized.race_color);
  if (normalized.religion) next.set("religion", normalized.religion);
  if (normalized.language) next.set("language", normalized.language);
  if (normalized.more_experienced) next.set("more_experienced", "true");
  if (normalized.discount_first_session) next.set("discount_first_session", "true");
  if (normalized.accepts_insurance) next.set("accepts_insurance", "true");
  if (normalized.social_value) next.set("social_value", "true");
  if (normalized.available_today) next.set("available_today", "true");
  if (normalized.verified) next.set("verified", "true");
  if (page > 1) next.set("page", String(page));

  return next;
};

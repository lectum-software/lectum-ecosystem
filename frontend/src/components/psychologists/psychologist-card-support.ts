import type { CSSProperties } from "react";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";

export type PsychologistCardItem = {
  id: string;
  name: string;
  avatar: string | null;
  headline: string | null;
  bio: string | null;
  video_url?: string | null;
  video_cover_url?: string | null;
  crp?: string | null;
  gender?: string | null;
  modality: string | null;
  rating_avg: number;
  rating_count: number;
  verified: boolean;
  available_today?: boolean;
  formation_years?: number | null;
  discount_first_session?: boolean;
  social_value?: boolean;
  accepts_insurance?: boolean;
  show_experience_tag?: boolean;
  whatsapp_name?: string | null;
  whatsapp_url?: string | null;
  favorited: boolean;
  specialties: Array<{ name: string }>;
  services: Array<{ name: string }>;
};

export type PsychologistCardProps = {
  canFavorite?: boolean;
  favoritePending?: boolean;
  psychologist: PsychologistCardItem;
  onToggleFavorite: (psychologist: PsychologistCardItem) => void;
};

export type AudioPreferenceListener = (soundEnabled: boolean) => void;

export let globalSoundEnabled = false;

export const audioPreferenceListeners = new Set<AudioPreferenceListener>();

export const subscribeAudioPreference = (listener: AudioPreferenceListener) => {
  listener(globalSoundEnabled);
  audioPreferenceListeners.add(listener);

  return () => {
    audioPreferenceListeners.delete(listener);
  };
};

export const setGlobalSoundEnabled = (next: boolean) => {
  if (globalSoundEnabled === next) return;

  globalSoundEnabled = next;

  for (const listener of audioPreferenceListeners) {
    listener(next);
  }
};

export const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const formatRating = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "0.0 (0)";

  return `${(ratingAvg / 100).toFixed(1)} (${ratingCount})`;
};

export const getPsychologistDisplayName = (psychologist: PsychologistCardItem) =>
  normalizeProfessionalDisplayName(psychologist.name) || psychologist.name;

export const getPsychologistTitle = (gender?: string | null) => {
  const normalized = gender?.toLowerCase();

  return normalized === "feminino" ? "PSICÓLOGA" : "PSICÓLOGO";
};

export const getPsychologistTypeLabel = (gender?: string | null) => {
  const normalized = gender?.toLowerCase();

  return normalized === "feminino" ? "Psic\u00f3loga" : "Psic\u00f3logo";
};

export const PSYCHOLOGIST_OVERLAY_HEIGHT = "26%";

export const OVERLAY_FAVORITE_OFFSET = "17%";

export const OVERLAY_SHARE_GAP = "clamp(48px, 12vw, 54px)";

export const OVERLAY_SIDE_BADGE_GAP = "clamp(8px, 2vw, 10px)";

export const OVERLAY_TAGS_MARGIN_PX = 8;

export type CardOverlayStyle = CSSProperties & { "--psychologist-overlay-height": string };

export const getSubinfo = (psychologist: PsychologistCardItem) => {
  const role = getPsychologistTitle(psychologist.gender);
  const years = psychologist.formation_years ?? 10;
  const rating = formatRating(psychologist.rating_avg, psychologist.rating_count);

  if (psychologist.show_experience_tag === false) {
    return `${role} • ★ ${rating}`;
  }

  return `${role} • ${years} ANOS EXP • ★ ${rating}`;
};

export const buildBenefitTags = (psychologist: PsychologistCardItem) => {
  const tags: string[] = [];

  if (psychologist.accepts_insurance) {
    tags.push("Aceita convênios");
  }

  if (psychologist.social_value) {
    tags.push("Valor social");
  }

  if (psychologist.discount_first_session) {
    tags.push("Desconto 1ª sessão");
  }

  return tags;
};

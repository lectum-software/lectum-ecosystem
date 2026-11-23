"use client";

// Persist the preference, never a browser's temporary autoplay denial.
const storageKey = "lectum:video-sound:explicit:v2";
let soundEnabled = false;
let preferenceRevision = 0;
let loaded = false;
let hasChoice = false;
const listeners = new Set<(enabled: boolean) => void>();

const loadPreference = () => {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = window.localStorage.getItem(storageKey);
    hasChoice = saved === "enabled" || saved === "muted";
    soundEnabled = saved === "enabled";
  } catch {
    // Restricted storage still supports a document-local choice.
  }
};

export const getVideoSoundEnabled = () => {
  loadPreference();
  return soundEnabled;
};

export const getVideoSoundPreferenceRevision = () => preferenceRevision;

// Explicit interactions only; playback/volumechange must not overwrite this.
export const setVideoSoundEnabledByUser = (enabled: boolean) => {
  loadPreference();
  hasChoice = true;
  soundEnabled = enabled;
  preferenceRevision += 1;
  try {
    window.localStorage.setItem(storageKey, enabled ? "enabled" : "muted");
  } catch {
    // Keep the in-memory preference when storage is unavailable.
  }
  for (const listener of listeners) listener(enabled);
};

export const prepareReelsSoundOnOpen = () => {
  loadPreference();
  if (!hasChoice) setVideoSoundEnabledByUser(true);
};

export const subscribeVideoSoundPreference = (listener: (enabled: boolean) => void) => {
  listeners.add(listener);
  listener(getVideoSoundEnabled());
  return () => {
    listeners.delete(listener);
  };
};

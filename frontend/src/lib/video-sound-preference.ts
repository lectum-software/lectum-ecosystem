"use client";

// New key: never import legacy preferences whose first activation was not explicit.
const STORAGE_KEY = "lectum:video-sound:explicit:v1";
let initialized = false;
let soundEnabled = false;
let soundBlockedForDocument = false;
let preferenceRevision = 0;
const listeners = new Set<(enabled: boolean) => void>();

export const getVideoSoundEnabled = () => {
  if (!initialized && typeof window !== "undefined") {
    initialized = true;
    try {
      soundEnabled = window.localStorage.getItem(STORAGE_KEY) === "enabled";
    } catch {
      /* Storage unavailable: retain the in-memory explicit choice. */
    }
  }
  return soundEnabled && !soundBlockedForDocument;
};

export const getVideoSoundPreferenceRevision = () => preferenceRevision;

// A muted autoplay fallback stays muted until the next explicit volume action.
export const suspendVideoSoundForDocument = (expectedRevision: number) => {
  if (expectedRevision !== preferenceRevision || !getVideoSoundEnabled()) return;
  soundBlockedForDocument = true;
  preferenceRevision += 1;
  for (const listener of listeners) listener(false);
};

// Only volume controls may call this setter; playback/volumechange must not.
export const setVideoSoundEnabledByUser = (enabled: boolean) => {
  initialized = true;
  soundEnabled = enabled;
  soundBlockedForDocument = false;
  preferenceRevision += 1;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "enabled" : "muted");
  } catch {
    /* Storage unavailable: retain the in-memory explicit choice. */
  }
  for (const listener of listeners) listener(enabled);
};

export const subscribeVideoSoundPreference = (listener: (enabled: boolean) => void) => {
  listeners.add(listener);
  listener(getVideoSoundEnabled());
  return () => {
    listeners.delete(listener);
  };
};

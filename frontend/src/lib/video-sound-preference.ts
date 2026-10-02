"use client";

// Share explicit volume choices only within this document; new visits start muted.
let soundEnabled = false;
let preferenceRevision = 0;
const listeners = new Set<(enabled: boolean) => void>();

export const getVideoSoundEnabled = () => soundEnabled;

export const getVideoSoundPreferenceRevision = () => preferenceRevision;

// Only volume controls may call this setter; playback/volumechange must not.
export const setVideoSoundEnabledByUser = (enabled: boolean) => {
  soundEnabled = enabled;
  preferenceRevision += 1;
  for (const listener of listeners) listener(enabled);
};

export const subscribeVideoSoundPreference = (listener: (enabled: boolean) => void) => {
  listeners.add(listener);
  listener(getVideoSoundEnabled());
  return () => {
    listeners.delete(listener);
  };
};

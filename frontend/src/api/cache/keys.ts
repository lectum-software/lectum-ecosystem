const keys = {
  auth: {
    hydrate: (cache?: unknown) => ["auth_hydrate", cache],
  },
  notification: {
    index: (filters?: unknown) => ["notification_index", filters],
    preferences: () => ["notification_preferences"],
  },
  patient: {
    profile: () => ["patient_profile"],
    favoritesRoot: () => ["patient_favorites"],
    favorites: (filters?: unknown) => ["patient_favorites", filters],
    followsRoot: () => ["patient_follows"],
    follows: (filters?: unknown) => ["patient_follows", filters],
  },
  directory: {
    psychologistsRoot: () => ["directory_psychologists"],
    psychologists: (filters?: unknown) => ["directory_psychologists", filters],
  },
  psychologistBilling: {
    plans: () => ["psychologist_billing_plans"],
    current: () => ["psychologist_billing_current"],
  },
};

export default keys;

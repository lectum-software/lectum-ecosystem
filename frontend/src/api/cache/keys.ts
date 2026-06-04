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
  },
};

export default keys;

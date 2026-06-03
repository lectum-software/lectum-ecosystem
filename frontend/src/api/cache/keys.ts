const keys = {
  auth: {
    hydrate: (cache?: unknown) => ["auth_hydrate", cache],
  },
  notification: {
    index: (filters?: unknown) => ["notification_index", filters],
    preferences: () => ["notification_preferences"],
  },
};

export default keys;

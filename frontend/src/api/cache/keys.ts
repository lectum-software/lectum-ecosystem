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
    reviewsRoot: () => ["patient_reviews"],
    reviews: (filters?: unknown) => ["patient_reviews", filters],
    reviewEligibility: (id: string) => ["patient_review_eligibility", id],
  },
  directory: {
    psychologistsRoot: () => ["directory_psychologists"],
    psychologists: (filters?: unknown) => ["directory_psychologists", filters],
    psychologistRoot: (id: string) => ["directory_psychologist", id],
    psychologist: (id: string) => ["directory_psychologist", id, "profile"],
    psychologistPosts: (id: string, filters?: unknown) => [
      "directory_psychologist",
      id,
      "posts",
      filters,
    ],
    psychologistReviews: (id: string, filters?: unknown) => [
      "directory_psychologist",
      id,
      "reviews",
      filters,
    ],
  },
  psychologistBilling: {
    plans: () => ["psychologist_billing_plans"],
    current: () => ["psychologist_billing_current"],
  },
  psychologistCfp: {
    root: () => ["psychologist_cfp"],
  },
  psychologistWhatsappVerification: {
    root: () => ["psychologist_whatsapp_verification"],
  },
};

export default keys;

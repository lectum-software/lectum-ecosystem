const keys = {
  auth: {
    root: () => ["auth_hydrate"],
    hydrate: (cache?: unknown) => ["auth_hydrate", cache],
  },
  account: {
    securityRoot: () => ["account_security"],
    security: (userId?: string | null) => ["account_security", userId ?? "anonymous"],
    tips: (userId?: string | null) => ["account_onboarding_tips", userId ?? "anonymous"],
  },
  notification: {
    root: () => ["notification_index"],
    index: (filters?: unknown) => ["notification_index", filters],
    unreadStatus: () => ["notification_index", "unread_status"],
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
  community: {
    root: () => ["community"],
    detail: (slug: string) => ["community", slug, "detail"],
    feed: (filters?: unknown) => ["community", "feed", filters],
    list: (filters?: unknown) => ["community", "list", filters],
    posts: (slug: string, filters?: unknown) => ["community", slug, "posts", filters],
    topMentors: (filters?: unknown) => ["community", "top_mentors", filters],
  },
  posts: {
    root: () => ["posts"],
    mine: (filters?: unknown) =>
      filters === undefined ? ["posts", "mine"] : ["posts", "mine", filters],
    saved: (filters?: unknown) =>
      filters === undefined ? ["posts", "saved"] : ["posts", "saved", filters],
    detail: (id: string) => ["posts", id, "detail"],
    replies: (id: string, filters?: unknown) => ["posts", id, "replies", filters],
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
    subscription: () => ["psychologist_billing_subscription"],
  },
  psychologistCfp: {
    root: () => ["psychologist_cfp"],
  },
  psychologistWhatsappVerification: {
    root: () => ["psychologist_whatsapp_verification"],
  },
  psychologistFreeProfile: {
    root: () => ["psychologist_free_profile"],
  },
  psychologistAnalytics: {
    root: () => ["psychologist_analytics"],
    show: (filters?: unknown) => ["psychologist_analytics", filters],
  },
  videoAssets: {
    playback: (assetId?: string | null) => ["video_asset_playback", assetId ?? "none"],
  },
  psychologistReviews: {
    root: () => ["psychologist_reviews"],
    list: (filters?: unknown) => ["psychologist_reviews", filters],
  },
};

export default keys;

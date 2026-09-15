type AccountDeleteConfirmationSubject = {
  password?: string | null;
  provider?: string | null;
};

const normalizeProvider = (provider?: string | null) => provider?.trim().toLowerCase() || null;

export const requiresGoogleDeleteReauth = (user: AccountDeleteConfirmationSubject) => {
  return normalizeProvider(user.provider) === "google";
};

export const requiresPasswordDeleteConfirmation = (user: AccountDeleteConfirmationSubject) => {
  return !requiresGoogleDeleteReauth(user) && Boolean(user.password);
};

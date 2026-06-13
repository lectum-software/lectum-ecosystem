export const GOOGLE_MANAGE_ACCOUNT_URL = "https://myaccount.google.com/security";

export const isGoogleOAuthConfigured = () => {
  return Boolean(
    process.env.BASE &&
      process.env.CALLBACK_URL_API_USER &&
      process.env.GOOGLE_CLIENT_ID_API_USER &&
      process.env.GOOGLE_CLIENT_SECRET_API_USER,
  );
};

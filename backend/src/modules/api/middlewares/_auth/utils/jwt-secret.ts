export const JWT_ALGORITHM = "HS256" as const;

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET_KEY?.trim();

  if (!secret) {
    throw new Error("JWT_SECRET_KEY_NOT_CONFIGURED");
  }

  return secret;
};

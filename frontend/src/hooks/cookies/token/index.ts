import Cookies from "@/hooks/cookies";

const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_LOCAL || "lectum.token";
const COOKIE_SESSION_MARKER = "cookie-session";

export const getToken = () => {
  return Cookies.get(TOKEN_KEY);
};

export const getBearerToken = () => {
  const token = getToken();
  return token && token !== COOKIE_SESSION_MARKER ? token : undefined;
};

export const setToken = (token: string) => {
  if (token) Cookies.set(TOKEN_KEY, token);
};

export const setSessionMarker = () => {
  Cookies.set(TOKEN_KEY, COOKIE_SESSION_MARKER);
};

export const removeToken = () => {
  Cookies.remove(TOKEN_KEY);
};

import Cookies from "@/hooks/cookies";

const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_LOCAL || "lectum.token";

export const getToken = () => {
  return Cookies.get(TOKEN_KEY);
};

export const setToken = (token: string) => {
  if (token) Cookies.set(TOKEN_KEY, token);
};

export const removeToken = () => {
  Cookies.remove(TOKEN_KEY);
};

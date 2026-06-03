import Cookies from "@/hooks/cookies";
import { removeToken } from "@/hooks/cookies/token";
import { removeUser } from "@/hooks/cookies/user";

export const cleanCookies = () => {
  const cookies = Cookies.getAll();

  Object.keys(cookies).forEach((cookie) => {
    Cookies.remove(cookie);
  });
};

export const signOut = async (callback?: boolean, redirect?: string) => {
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }

  removeToken();
  removeUser();
  cleanCookies();

  if (typeof window === "undefined") return;

  const currentPath = window.location.pathname;

  if (redirect) {
    window.location.href = redirect;
    return;
  }

  window.location.href = callback ? `/auth/login?callbackUrl=${currentPath}` : "/auth/login";
};

export const useSignOut = (callback?: boolean) => {
  const out = async (redirect?: string) => {
    await signOut(callback, redirect);
  };

  return { out };
};

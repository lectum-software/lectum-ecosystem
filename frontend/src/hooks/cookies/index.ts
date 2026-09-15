import Cookies from "js-cookie";

const configuredExpiration = Number(process.env.NEXT_PUBLIC_COOKIE_EXPIRE_DAYS);
const expires =
  Number.isInteger(configuredExpiration) && configuredExpiration > 0 && configuredExpiration <= 30
    ? configuredExpiration
    : 7;

const options: Cookies.CookieAttributes = {
  expires,
  sameSite: "lax",
  secure:
    typeof window !== "undefined"
      ? window.location.protocol === "https:"
      : process.env.NODE_ENV === "production",
};

const set = (key: string, value: string) => {
  Cookies.set(key, value, options);
};

const get = (key: string) => {
  return Cookies.get(key);
};

const remove = (key: string) => {
  Cookies.remove(key, options);
  Cookies.remove(key);
};

const cookie = {
  set,
  get,
  remove,
  options,
};

export default cookie;

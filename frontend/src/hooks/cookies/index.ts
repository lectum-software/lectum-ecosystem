import Cookies from "js-cookie";

const expires = Number(process.env.NEXT_PUBLIC_COOKIE_EXPIRE_DAYS || 7);

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

const getAll = () => {
  return Cookies.get();
};

const remove = (key: string) => {
  Cookies.remove(key, options);
  Cookies.remove(key);
};

const cookie = {
  set,
  get,
  getAll,
  remove,
  options,
};

export default cookie;

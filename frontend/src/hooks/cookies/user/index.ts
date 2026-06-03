import Cookies from "@/hooks/cookies";

export interface UserInfos {
  confirm: boolean;
  welcome: boolean;
  plans: boolean;
}

const USER_KEY = process.env.NEXT_PUBLIC_USER_LOCAL || "lectum.user";

export const getUser = (): Partial<UserInfos> => {
  return JSON.parse(Cookies.get(USER_KEY) || "{}");
};

export const setUser = (data: UserInfos) => {
  Cookies.set(USER_KEY, JSON.stringify(data));
};

export const removeUser = () => {
  Cookies.remove(USER_KEY);
};

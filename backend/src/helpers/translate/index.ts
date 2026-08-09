import { resolve } from "./resolve";

export const error = (code: string, data?: Record<string, unknown>) => {
  const text: string = resolve(`error.${code}`, { gender: "o", ...data });

  return {
    success: false,
    error: text,
    code,
    data: data,
  };
};

export const msg = (code: string, data: Record<string, unknown> = {}) => {
  const text: string = resolve(`message.${code}`, { gender: "o", ...data });

  return {
    success: true,
    message: text,
    code: code,
    data: data,
  };
};

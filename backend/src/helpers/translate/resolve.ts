/* eslint-disable @typescript-eslint/no-explicit-any */

import i18next from "@/main/server/i18n";

const translate = (key: string, data: Record<string, unknown> = {}) => {
  const translated = i18next.t(key, { ...data });
  return typeof translated === "string" ? translated : key;
};

export const resolve = (code: string, data: Record<string, unknown> = {}) => {
  data = Object.keys(data).reduce<Record<string, unknown>>((acc, key) => {
    const value = translate(`${key}.${data[key]}`);
    acc[key] =
      value === `${key}.${data[key]}` || typeof value !== "string" || value.length === 0
        ? data[key]
        : value;

    return acc;
  }, {});

  let text = translate(code, { gender: "o", ...data });
  text = text?.slice(0, 1)?.toUpperCase() + text?.slice(1);

  return text;
};

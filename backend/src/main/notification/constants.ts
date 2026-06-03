import { resolve } from "@/helpers/translate/resolve";

export const messages = {
  test: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.test.title", data),
      body: resolve("notification.test.body", data),
    };
  },
};

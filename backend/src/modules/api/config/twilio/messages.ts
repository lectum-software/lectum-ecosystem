//
import { resolve } from "@/helpers/translate/resolve";
import { type SMSResult, sendSMS } from "./index";

export type MessagePath = {
  to: string;
  code?: string;
};

export type Message = (path: MessagePath) => Promise<SMSResult>;

export const messages: Record<string, Message> = {
  code: async (path: MessagePath) => {
    const obj = {
      to: path.to,
      subject: resolve("sms.code"),
      message: resolve("sms.use_to_confirm", {
        code: path.code,
      }),
    };
    const success = await sendSMS(obj);
    return success;
  },
};

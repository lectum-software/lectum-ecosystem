//Libs

import { isWebPushConfigured, vapidKeys } from "@/config/webPush";
import { msg } from "@/helpers/translate";

export default async () => {
  return {
    status: 200,
    ...msg("show", {
      //If you need a custom text
    }),
    data: {
      key: isWebPushConfigured() ? vapidKeys.publicKey : "",
    },
  };
};

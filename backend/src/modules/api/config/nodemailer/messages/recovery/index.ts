import { resolve } from "@/helpers/translate/resolve";
import { send } from "../../send";

export interface IRecoveryEmailSend {
  name: string;
  email: string;
  code: string;
}

export const recoveryEmailSend = async (props: IRecoveryEmailSend) => {
  const name = props?.name?.split(" ")?.[0];
  const minutes = process.env.CODE_API_USER_VALID_MINUTES;
  const url = `${process.env.WEB_URL?.split(",")[0]}${process.env.RECOVERY_URL}?code=${props.code}`;

  await send({
    to: props.email,
    subject: resolve("email.recovery_code"),
    template: "transactional",
    messageProps: {
      name,
      email: props.email,
      hello: resolve("email.hello", { name }),
      not_share_link: resolve("email.not_share_link"),
      valid_link: resolve("email.valid_link", {
        minutes,
      }),
      on_click_to_recovery: resolve("email.on_click_to_recovery"),
      btn_recovery_password: resolve("email.btn_recovery_password"),
      url,
      send_for: resolve("email.send_for"),
    },
  });
};

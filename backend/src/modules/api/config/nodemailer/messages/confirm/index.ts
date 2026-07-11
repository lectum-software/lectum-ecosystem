import { resolve } from "@/helpers/translate/resolve";
import { send } from "../../send";

export interface IConfirmEmailSend {
  name: string;
  email: string;
  code: string;
}

export const confirmEmailSend = async (props: IConfirmEmailSend) => {
  const name = props?.name?.split(" ")?.[0];
  const minutes = process.env.CODE_API_USER_VALID_MINUTES;

  return send({
    to: props.email,
    subject: resolve("email.confirm_code"),
    template: "transactional",
    messageProps: {
      name,
      email: props.email,
      hello: resolve("email.hello", { name }),
      not_share_code: resolve("email.not_share_code"),
      use_to_confirm: resolve("email.use_to_confirm"),
      valid_code: resolve("email.valid_code", {
        minutes,
      }),
      code: props.code,
      send_for: resolve("email.send_for"),
    },
  });
};

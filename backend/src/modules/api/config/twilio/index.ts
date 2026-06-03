import { Twilio } from "twilio";

const accountSid = process.env.TWILIO_API_ACCOUNT_SID!;
const authToken = process.env.TWILIO_API_AUTH_TOKEN!;
const phone = process.env.TWILIO_API_PHONE_NUMBER!;

//
export type SMS = {
  to: number | string;
  subject: string;
  message: string;
};

export const sendSMS = async ({ to, subject, message }: SMS) => {
  const client = new Twilio(accountSid, authToken);

  const numb = to?.toString();
  if (!numb.includes("+55")) to = `+55${numb}`;

  const res = await client.messages
    .create({
      body: `${subject?.toUpperCase()}: ${message}`,
      from: phone,
      to: to.toString(),
    })
    .then((message) => {
      console.log("SMS send to:", message.to);
      return true;
    })
    .catch((error) => {
      console.error(error);
      return false;
    });

  return res;
};

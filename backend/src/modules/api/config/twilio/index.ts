import { Twilio } from "twilio";

const accountSid = process.env.TWILIO_API_ACCOUNT_SID!;
const authToken = process.env.TWILIO_API_AUTH_TOKEN!;
const phone = process.env.TWILIO_API_PHONE_NUMBER!;

export const isTwilioConfigured = () => Boolean(accountSid && authToken && phone);

//
export type SMS = {
  to: number | string;
  subject: string;
  message: string;
};

export const sendSMS = async ({ to, subject, message }: SMS) => {
  if (!isTwilioConfigured()) return false;

  const client = new Twilio(accountSid, authToken);

  const numb = to?.toString();
  const digits = numb.replace(/\D/g, "");
  const target = numb.startsWith("+")
    ? numb
    : digits.startsWith("55")
      ? `+${digits}`
      : `+55${digits}`;

  const res = await client.messages
    .create({
      body: `${subject?.toUpperCase()}: ${message}`,
      from: phone,
      to: target,
    })
    .then(() => {
      return true;
    })
    .catch((error) => {
      console.error("SMS send failed", error?.code || "unknown");
      return false;
    });

  return res;
};

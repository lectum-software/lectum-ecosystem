import { Twilio } from "twilio";

const accountSid = process.env.TWILIO_API_ACCOUNT_SID;
const authToken = process.env.TWILIO_API_AUTH_TOKEN;
const phone = process.env.TWILIO_API_PHONE_NUMBER;
const messagingServiceSid = process.env.TWILIO_API_MESSAGING_SERVICE_SID;

export const isTwilioConfigured = () =>
  Boolean(accountSid && authToken && (phone || messagingServiceSid));

//
export type SMS = {
  to: number | string;
  subject: string;
  message: string;
};

export type SMSResult =
  | {
      success: true;
      providerMessageId?: string;
      providerStatus?: string;
    }
  | {
      success: false;
      configurationError?: boolean;
      errorCode?: string;
      providerMessageId?: string;
      providerStatus?: string;
    };

export const sendSMS = async ({ to, subject, message }: SMS) => {
  if (!isTwilioConfigured()) {
    return {
      success: false,
      configurationError: true,
    } satisfies SMSResult;
  }

  const client = new Twilio(accountSid!, authToken!);

  const numb = to?.toString();
  const digits = numb.replace(/\D/g, "");
  const target = numb.startsWith("+")
    ? numb
    : digits.startsWith("55")
      ? `+${digits}`
      : `+55${digits}`;

  try {
    const twilioMessage = await client.messages.create({
      body: `${subject?.toUpperCase()}: ${message}`,
      ...(messagingServiceSid ? { messagingServiceSid } : { from: phone! }),
      to: target,
    });

    if (
      twilioMessage.errorCode ||
      twilioMessage.status === "failed" ||
      twilioMessage.status === "undelivered"
    ) {
      console.error("[SMS] O provedor recusou o envio.");
      return {
        success: false,
        errorCode: twilioMessage.errorCode ? String(twilioMessage.errorCode) : undefined,
        providerMessageId: twilioMessage.sid,
        providerStatus: twilioMessage.status,
      } satisfies SMSResult;
    }

    return {
      success: true,
      providerMessageId: twilioMessage.sid,
      providerStatus: twilioMessage.status,
    } satisfies SMSResult;
  } catch (error) {
    const twilioError = error as { code?: number | string };

    console.error("[SMS] O envio falhou no provedor.");
    return {
      success: false,
      errorCode: twilioError?.code ? String(twilioError.code) : undefined,
    } satisfies SMSResult;
  }
};

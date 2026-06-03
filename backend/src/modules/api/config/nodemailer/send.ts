import path from "node:path";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";

dotenv.config();

import type { MessageProps } from "./types";

type Send = {
  subject: string;
  to: string;
  template: string;
  type?: "transactional" | "marketing";
  messageProps: MessageProps;
};

const send = async ({
  to,
  subject,
  template,
  type = "transactional",
  messageProps,
}: Send): Promise<boolean> => {
  try {
    if (process.env.NODE_ENV === "test") return Promise.resolve(true);

    const user = process.env.EMAIL_API_EMAIL;
    //Replace all ' and all ""
    const pass = process.env.EMAIL_API_KEY?.replace(/'/g, "").replace(/"/g, "");

    if (!user || !pass) {
      console.log("**Cred for email not found** this action will be ignored **");
      return Promise.resolve(true);
    }

    return new Promise((resolve, reject) => {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_API_HOST,
        port: Number(process.env.EMAIL_API_PORT),
        secure: process.env.EMAIL_API_SECURE === "true",
        auth: {
          user,
          pass,
        },
      });

      const handlebarOptions = {
        viewEngine: {
          extName: ".hbs",
          partialsDir: path.resolve("templates"),
          defaultLayout: false,
        },
        viewPath: path.resolve("templates"),
        extName: ".hbs",
      };

      //@ts-expect-error
      transporter.use("compile", hbs(handlebarOptions));

      const headers: any = {};

      if (type === "marketing") {
        headers["List-Unsubscribe"] = `<mailto:${process.env.EMAIL_API_UNSUBSCRIBE!}>`;
      } else {
        // Headers para reforçar prioridade transacional
        headers["X-Priority"] = "1";
        headers["X-MSMail-Priority"] = "High";
        headers.Importance = "High";
      }

      //
      const mailOptions = {
        from: {
          name: process.env.EMAIL_API_NAME!,
          address: process.env.EMAIL_API_SENDER!,
        },
        sender: process.env.EMAIL_API_SENDER!,
        replyTo: process.env.EMAIL_API_SENDER!, // Boa prática
        to,
        subject,
        text: subject.toUpperCase(),
        template,
        headers,
        context: {
          ...messageProps,
          system: process.env.SYSTEM_NAME!,
          logo: process.env.SYSTEM_LOGO!,
        },
        tls: {
          ciphers: "SSLv3",
        },
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
          return reject(new Error(`Failed to send email: ${error.message}`));
        } else {
          console.log(`Email sent: ${info.response}`);
          resolve(true);
        }
      });
    });
  } catch (e) {
    console.log(`[ERROR] -In sending email:${e}`);
    return false;
  }
};

export { send };

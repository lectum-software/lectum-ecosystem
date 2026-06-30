import { readFile } from "node:fs/promises";
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

type TemplateContext = Record<string, unknown>;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "erro desconhecido";

const getTemplateValue = (context: TemplateContext, key: string) => {
  return key.split(".").reduce<unknown>((acc, item) => {
    if (acc && typeof acc === "object" && item in acc) {
      return (acc as TemplateContext)[item];
    }

    return undefined;
  }, context);
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderConditionalBlocks = (template: string, context: TemplateContext) => {
  let html = template;
  let start = html.lastIndexOf("{{#if ");

  while (start !== -1) {
    const startEnd = html.indexOf("}}", start);
    const closeStart = html.indexOf("{{/if}}", startEnd);

    if (startEnd === -1 || closeStart === -1) {
      return html;
    }

    const closeEnd = closeStart + "{{/if}}".length;
    const key = html.slice(start + "{{#if ".length, startEnd).trim();
    const content = html.slice(startEnd + 2, closeStart);
    const replacement = getTemplateValue(context, key) ? content : "";

    html = `${html.slice(0, start)}${replacement}${html.slice(closeEnd)}`;
    start = html.lastIndexOf("{{#if ");
  }

  return html;
};

const renderTemplate = (template: string, context: TemplateContext) => {
  let html = template.replace(/{{!--[\s\S]*?--}}/g, "");
  html = renderConditionalBlocks(html, context);

  html = html.replace(/{{{\s*([\w.]+)\s*}}}/g, (_, key) =>
    String(getTemplateValue(context, key) ?? ""),
  );

  return html.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) =>
    escapeHtml(String(getTemplateValue(context, key) ?? "")),
  );
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
      console.warn("[EMAIL] Credenciais SMTP ausentes; envio ignorado.");
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

      const templatesPath = path.resolve("templates");
      const viewEngine = {
        renderView: async (templatePath: string, context: TemplateContext) => {
          const template = await readFile(templatePath, "utf8");
          return renderTemplate(template, context);
        },
      };

      const handlebarOptions = {
        viewEngine,
        viewPath: templatesPath,
        extName: ".hbs",
      };

      transporter.use("compile", hbs(handlebarOptions as unknown as Parameters<typeof hbs>[0]));

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
          minVersion: "TLSv1.2",
        },
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("[EMAIL] Falha no envio:", getErrorMessage(error));
          return reject(new Error(`Failed to send email: ${error.message}`));
        } else {
          console.log(`Email sent: ${info.response}`);
          resolve(true);
        }
      });
    });
  } catch (e) {
    console.error(`[EMAIL] Erro no fluxo de envio: ${getErrorMessage(e)}`);
    return false;
  }
};

export { send };

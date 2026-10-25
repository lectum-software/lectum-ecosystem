import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { it } from "node:test";
import nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import { renderTemplate } from "./send";

it("compiles the real transactional template with Nodemailer without SMTP delivery", async () => {
  const transporter = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const options = {
    viewPath: path.resolve("templates"),
    extName: ".hbs",
    viewEngine: {
      renderView: async (file: string, context: Record<string, unknown>) =>
        renderTemplate(await readFile(file, "utf8"), context),
    },
  };
  const plugin = hbs(options as unknown as Parameters<typeof hbs>[0]);
  transporter.use("compile", plugin as unknown as Parameters<typeof transporter.use>[1]);
  for (const context of [
    { code: "123456", use_to_confirm: "Confirm your email" },
    { url: "https://example.invalid/recovery", btn_recovery_password: "Recover access" },
  ]) {
    const message = {
      from: { name: "Lectum", address: "sender@example.invalid" },
      to: "recipient@example.invalid",
      subject: "Transactional test",
      template: "transactional",
      context: { system: "Lectum", welcome: "Name <script>", ...context },
      text: "Transactional test",
      textEncoding: "base64" as const,
      headers: { "X-Priority": "1" },
      disableFileAccess: true,
      disableUrlAccess: true,
    };
    const result = await transporter.sendMail(message);
    assert.deepEqual(result.envelope.to, ["recipient@example.invalid"]);
    assert.ok(Buffer.isBuffer(result.message));
    const mime = result.message.toString();
    assert.match(mime, /multipart\/alternative/);
    assert.match(mime, /X-Priority: 1/);
    const htmlPart = mime.split("Content-Type: text/html;")[1];
    assert.ok(htmlPart);
    const encoded = htmlPart.split(/\r?\n\r?\n/)[1].split(/\r?\n--/)[0];
    const html = Buffer.from(encoded.replace(/\s/g, ""), "base64").toString();
    assert.match(html, /Name &lt;script&gt;/);
    assert.ok(html.includes(context.code ?? context.url ?? ""));
    assert.doesNotMatch(html, /\{\{/);
  }
  transporter.close();
});

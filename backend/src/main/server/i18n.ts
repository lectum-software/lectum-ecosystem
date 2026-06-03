import fs from "node:fs";
import path from "node:path";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import * as middleware from "i18next-http-middleware";

const getFolderNames = (): string[] => {
  const localesPath = path.join(process.cwd(), "locales");
  if (!fs.existsSync(localesPath)) {
    throw new Error(`O diretório de idiomas não existe: ${localesPath}`);
  }
  return fs
    .readdirSync(localesPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
};

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: "pt",
    preload: getFolderNames(),
    ns: ["translation", "zod"],
    defaultNS: "translation",
    backend: {
      loadPath: path.join(process.cwd(), "locales/{{lng}}/{{ns}}.json"),
    },
    detection: {
      order: ["header"],
      lookupQuerystring: "lng",
      lookupHeader: "accept-language",
    },
    saveMissing: false,
    interpolation: {
      escapeValue: false,
    },
  })
  .catch((err) => {
    console.error("Erro ao inicializar i18next:", err);
  });

export default i18next;

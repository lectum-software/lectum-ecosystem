import { z } from "zod";
import { i18n, language } from "../../../i18n";

const FALLBACK_MESSAGE = "Valor inválido.";

// Zod 4 usa input/origin/format; received/type/validation pertenciam ao Zod 3.
// Nunca interpolar o valor recebido, tipos internos, opções de enum ou nomes extras.
z.setErrorMap((issue) => {
  if (!language || !i18n) return { message: FALLBACK_MESSAGE };

  const translate = i18n.getFixedT(language, "zod");
  const vars: Record<string, unknown> = {};
  let key: string;

  switch (issue.code) {
    case "invalid_type":
      key =
        issue.input === undefined || issue.input === null
          ? "errors.invalid_type_received_undefined"
          : "errors.invalid_type";
      break;
    case "invalid_value":
      key = "errors.invalid_enum_value";
      break;
    case "unrecognized_keys":
      key = "errors.unrecognized_keys";
      break;
    case "invalid_union":
      key = "errors.invalid_union";
      break;
    case "invalid_format": {
      const format = ["email", "url", "uuid", "cuid", "datetime"].includes(issue.format)
        ? issue.format
        : "regex";
      key = `errors.invalid_string.${format}`;
      break;
    }
    case "too_small": {
      const mode = issue.exact ? "exact" : issue.inclusive ? "inclusive" : "not_inclusive";
      key = `errors.too_small.${issue.origin}.${mode}`;
      vars.minimum = issue.minimum;
      break;
    }
    case "too_big": {
      const mode = issue.exact ? "exact" : issue.inclusive ? "inclusive" : "not_inclusive";
      key = `errors.too_big.${issue.origin}.${mode}`;
      vars.maximum = issue.maximum;
      break;
    }
    case "not_multiple_of":
      key = "errors.not_multiple_of";
      vars.multipleOf = issue.divisor;
      break;
    default:
      key = "errors.custom";
  }

  const translated: unknown = translate(key, vars);
  return {
    message:
      typeof translated === "string" && translated !== key && translated.trim()
        ? translated
        : FALLBACK_MESSAGE,
  };
});

export { z };

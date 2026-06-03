import { z } from "zod";
import { i18n, language } from "../../../i18n";

z.setErrorMap((issue) => {
  const defaultMessage =
    typeof issue.message === "string" && issue.message ? issue.message : "Invalid value";

  if (!language || !i18n) return { message: defaultMessage };

  const tZod = i18n?.getFixedT(language, "zod");

  let key: string;
  const vars: Record<string, any> = {};

  switch (issue.code as string) {
    case "invalid_type": {
      const typed = issue as any;
      if (typed.received === "undefined") {
        key = "errors.invalid_type_received_undefined";
      } else if (typed.received === "null") {
        key = "errors.invalid_type_received_null";
      } else {
        key = "errors.invalid_type";
        vars.expected = typed.expected;
        vars.received =
          typeof typed.received === "string" ? `"${typed.received}"` : String(typed.received);
      }
      break;
    }

    case "invalid_literal": {
      const typed = issue as any;
      key = "errors.invalid_literal";
      vars.expected = typed.expected;
      break;
    }

    case "unrecognized_keys": {
      const typed = issue as any;
      key = "errors.unrecognized_keys";
      vars.keys = (typed.keys || []).join(", ");
      break;
    }

    case "invalid_union":
      key = "errors.invalid_union";
      break;

    case "invalid_union_discriminator": {
      const typed = issue as any;
      key = "errors.invalid_union_discriminator";
      vars.options = (typed.options || []).join(", ");
      break;
    }

    case "invalid_enum_value": {
      const typed = issue as any;
      key = "errors.invalid_enum_value";
      vars.options = (typed.options || []).join(", ");
      vars.received = typed.received;
      break;
    }

    case "invalid_arguments":
      key = "errors.invalid_arguments";
      break;

    case "invalid_return_type":
      key = "errors.invalid_return_type";
      break;

    case "invalid_date":
      key = "errors.invalid_date";
      break;

    case "custom":
      key = "errors.custom";
      break;

    case "invalid_intersection_types":
      key = "errors.invalid_intersection_types";
      break;

    case "not_multiple_of": {
      const typed = issue as any;
      key = "errors.not_multiple_of";
      vars.multipleOf = typed.multipleOf;
      break;
    }

    case "not_finite":
      key = "errors.not_finite";
      break;

    case "invalid_string": {
      const typed = issue as any;
      const v = typed.validation as string;
      if (
        v &&
        ["email", "url", "uuid", "cuid", "regex", "datetime", "startsWith", "endsWith"].includes(v)
      ) {
        key = `errors.invalid_string.${v}`;
        if (v === "startsWith") {
          vars.startsWith = (typed as any).startsWith;
        } else if (v === "endsWith") {
          vars.endsWith = (typed as any).endsWith;
        }
      } else {
        key = "errors.invalid_string.regex";
      }
      break;
    }

    case "too_small": {
      const typed = issue as any;
      const mode = typed.exact ? "exact" : typed.inclusive ? "inclusive" : "not_inclusive";
      key = `errors.too_small.${typed.type}.${mode}`;
      vars.minimum = typed.minimum;
      break;
    }

    case "too_big": {
      const typed = issue as any;
      const mode = typed.exact ? "exact" : typed.inclusive ? "inclusive" : "not_inclusive";
      key = `errors.too_big.${typed.type}.${mode}`;
      vars.maximum = typed.maximum;
      break;
    }

    default:
      return { message: defaultMessage };
  }

  const raw = tZod(key, vars);
  const message = typeof raw === "string" ? raw : String(raw);
  return { message };
});

export { z };

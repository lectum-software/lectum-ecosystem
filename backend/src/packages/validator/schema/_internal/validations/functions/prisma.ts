import type { IValidationParams } from "../types";
import { z } from "../zod";

function normalizeBracketKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => normalizeBracketKeys(item));
  }

  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // Verifica se o objeto tem apenas chaves numéricas sequenciais (array serializado)
  const keys = Object.keys(obj);
  const numericKeys = keys.filter((key) => /^\d+$/.test(key));
  const isSerializedArray =
    numericKeys.length > 0 &&
    numericKeys.length === keys.length &&
    numericKeys.every((key, index) => parseInt(key) === index);

  if (isSerializedArray) {
    // Reconstrói o array a partir das chaves numéricas
    return numericKeys.map((key) => normalizeBracketKeys(obj[key]));
  }

  // Verifica se é um objeto orderBy com chaves numéricas (caso específico do Prisma)
  if (keys.length > 0 && keys.every((key) => /^\d+$/.test(key))) {
    // Reconstrói como array ordenado
    const sortedKeys = keys.sort((a, b) => parseInt(a) - parseInt(b));
    return sortedKeys.map((key) => normalizeBracketKeys(obj[key]));
  }

  const out: Record<string, any> = {};

  for (const [flatKey, value] of Object.entries(obj)) {
    // Remove colchetes do início e fim da chave se existirem
    const cleanKey = flatKey.replace(/^\[|\]$/g, "");

    // Se a chave original tinha colchetes, use a chave limpa
    const keyToUse = flatKey.startsWith("[") && flatKey.endsWith("]") ? cleanKey : flatKey;

    const parts = keyToUse.split(/\[|\]/).filter((p) => p !== "");

    if (parts.length > 1) {
      let cursor = out;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (
          cursor[key] === undefined ||
          typeof cursor[key] !== "object" ||
          Array.isArray(cursor[key])
        ) {
          cursor[key] = {};
        }
        cursor = cursor[key];
      }
      cursor[parts[parts.length - 1]] = normalizeBracketKeys(value);
    } else {
      out[keyToUse] = normalizeBracketKeys(value);
    }
  }

  // Verifica se o objeto resultante tem apenas chaves numéricas (pós-normalização)
  const finalKeys = Object.keys(out);
  if (finalKeys.length > 0 && finalKeys.every((key) => /^\d+$/.test(key))) {
    const sortedKeys = finalKeys.sort((a, b) => parseInt(a) - parseInt(b));
    return sortedKeys.map((key) => normalizeBracketKeys(out[key]));
  }

  // Verifica se algum valor do objeto tem chaves numéricas e converte recursivamente
  for (const [key, value] of Object.entries(out)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const valueKeys = Object.keys(value);
      if (valueKeys.length > 0 && valueKeys.every((k) => /^\d+$/.test(k))) {
        const sortedKeys = valueKeys.sort((a, b) => parseInt(a) - parseInt(b));
        out[key] = sortedKeys.map((k) => normalizeBracketKeys(value[k]));
      }
    }
  }

  return out;
}

function parseDeep(value: any): any {
  if (Array.isArray(value)) {
    return value.map(parseDeep);
  }

  if (value !== null && typeof value === "object") {
    const o: Record<string, any> = {};
    for (const [key, v] of Object.entries(value)) {
      o[key] = parseDeep(v);
    }
    return o;
  }

  if (typeof value === "string") {
    const v = value.trim();
    if (v === "true") return true;
    if (v === "false") return false;
    if (v === "null") return null;
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
    try {
      const parsed = JSON.parse(v);
      return parseDeep(parsed);
    } catch {}
  }

  return value;
}

export default (_: IValidationParams) => {
  return z
    .preprocess((raw, ctx) => {
      try {
        const initial =
          typeof raw === "string" && raw.trim().startsWith("{") ? JSON.parse(raw) : raw;

        const normalized =
          initial && typeof initial === "object" && !Array.isArray(initial)
            ? normalizeBracketKeys(initial as Record<string, any>)
            : initial;

        return parseDeep(normalized);
      } catch (err) {
        ctx.addIssue({
          code: "custom",
        });
        return undefined;
      }
    }, z.any())
    .optional();
};

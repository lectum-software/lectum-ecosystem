import { i18n, language } from "../../../i18n";

export const custom = (message: string, data: Record<string, any> = {}, conj?: string) => {
  if (!language || !i18n) return;

  const tZod = i18n?.getFixedT(language, "zod");

  const conjugation = conj ? tZod?.(`conjugations.${conj}`) : undefined;

  const text = tZod?.(`errors.${message}`, { ...data, conjugation });

  return text;
};

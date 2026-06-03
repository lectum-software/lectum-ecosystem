export let i18n: any;
export let language: string;

export const setI18n = (i18next: any, lang: string) => {
  i18n = i18next;
  language = lang;
};

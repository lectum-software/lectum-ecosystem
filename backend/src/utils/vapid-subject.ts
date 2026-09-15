export const normalizeVapidSubject = (value: string | undefined) => {
  const subject = value?.trim() ?? "";
  const hasWhitespaceOrControl = Array.from(subject).some((character) => {
    const code = character.charCodeAt(0);
    return /\s/u.test(character) || code <= 31 || code === 127;
  });
  if (!subject || subject.length > 2_048 || hasWhitespaceOrControl) return "";

  const rawEmail = subject.toLowerCase().startsWith("mailto:") ? subject.slice(7) : subject;
  if (!subject.toLowerCase().startsWith("https://")) {
    if (
      rawEmail.length > 254 ||
      !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(
        rawEmail,
      )
    ) {
      return "";
    }

    return `mailto:${rawEmail}`;
  }

  try {
    const url = new URL(subject);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
};

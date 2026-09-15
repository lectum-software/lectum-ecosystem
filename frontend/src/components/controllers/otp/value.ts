// Espaços representam casas vazias somente durante a edição. O schema do formulário
// continua exigindo todos os dígitos antes de permitir qualquer envio à API.
export const normalizeOtpValue = (value: string, length: number) =>
  value
    .replace(/[^\d ]/g, "")
    .slice(0, length)
    .trimEnd();

export const isCompleteOtpValue = (value: string, length: number) =>
  value.length === length && /^\d+$/.test(value);

export function editOtpValue(value: string, index: number, input: string, length: number) {
  const characters = normalizeOtpValue(value, length).padEnd(length, " ").split("");
  const digits = input.replace(/\D/g, "").slice(0, length - index);

  if (index < 0 || index >= length) return normalizeOtpValue(value, length);

  if (!digits) {
    characters[index] = " ";
  } else {
    for (const [offset, digit] of Array.from(digits).entries()) {
      characters[index + offset] = digit;
    }
  }

  return normalizeOtpValue(characters.join(""), length);
}

type LectumShareFileNameTarget = {
  cardLabel: "Postado na Lectum" | "Respondido na Lectum";
  professional: {
    name: string;
  };
};

const FILE_NAME_MAX_LENGTH = 90;
const CONTROL_FILE_NAME_CHARACTERS = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(31)}]+`,
  "gu",
);
const INVALID_FILE_NAME_CHARACTERS = /[<>:"/\\|?*]+/gu;

export const shareFileTitle = (target: LectumShareFileNameTarget) => {
  const professionalName = target.professional.name.replace(/\s+/g, " ").trim() || "Lectum";

  return `${professionalName} - ${target.cardLabel}`;
};

const sanitizeFileName = (value: string) => {
  const sanitized = value
    .normalize("NFKC")
    .replace(INVALID_FILE_NAME_CHARACTERS, "")
    .replace(CONTROL_FILE_NAME_CHARACTERS, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/u, "");
  const limited = sanitized
    .slice(0, FILE_NAME_MAX_LENGTH)
    .trim()
    .replace(/[. ]+$/u, "");

  return limited || "Lectum";
};

export const safeFileName = (target: LectumShareFileNameTarget, extension: string) =>
  `${sanitizeFileName(shareFileTitle(target))}.${extension}`;

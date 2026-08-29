type LectumShareFileNameTarget = {
  cardLabel: "Postado na Lectum" | "Respondido na Lectum";
  professional: {
    name: string;
  };
  sourceText?: string | null;
};

const FILE_NAME_MAX_LENGTH = 120;
const FILE_NAME_PROFESSIONAL_MAX_LENGTH = 42;
const FILE_NAME_CONTEXT_MAX_LENGTH = 58;
const LECTUM_FILE_NAME_SUFFIX = "Lectum";
const CONTROL_FILE_NAME_CHARACTERS = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(31)}]+`,
  "gu",
);
const INVALID_FILE_NAME_CHARACTERS = /[<>:"/\\|?*]+/gu;
const TRAILING_FILE_NAME_SEPARATORS = /[\s.,;:!?-]+$/u;

export const shareFileTitle = (target: LectumShareFileNameTarget) => {
  const professionalName = target.professional.name.replace(/\s+/g, " ").trim() || "Lectum";

  return `${professionalName} na Lectum`;
};

const sanitizeFileNamePart = (value: string) =>
  value
    .normalize("NFKC")
    .replace(INVALID_FILE_NAME_CHARACTERS, " ")
    .replace(CONTROL_FILE_NAME_CHARACTERS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(TRAILING_FILE_NAME_SEPARATORS, "");

const truncateFileNamePart = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;

  return value.slice(0, maxLength).trim().replace(TRAILING_FILE_NAME_SEPARATORS, "");
};

const compactProfessionalFileName = (name: string) =>
  truncateFileNamePart(sanitizeFileNamePart(name), FILE_NAME_PROFESSIONAL_MAX_LENGTH) || "Lectum";

const compactContextFileName = (sourceText?: string | null) =>
  truncateFileNamePart(sanitizeFileNamePart(sourceText ?? ""), FILE_NAME_CONTEXT_MAX_LENGTH);

const sanitizeFileName = (value: string) => {
  const sanitized = sanitizeFileNamePart(value);
  const limited = truncateFileNamePart(sanitized, FILE_NAME_MAX_LENGTH);

  return limited || "Lectum";
};

const shareFileBaseName = (target: LectumShareFileNameTarget) => {
  const professionalName = compactProfessionalFileName(target.professional.name);
  const contextName = compactContextFileName(target.sourceText);

  if (!contextName) return shareFileTitle(target);

  return `${professionalName} - ${contextName} - ${LECTUM_FILE_NAME_SUFFIX}`;
};

export const safeFileName = (target: LectumShareFileNameTarget, extension: string) =>
  `${sanitizeFileName(shareFileBaseName(target))}.${extension}`;

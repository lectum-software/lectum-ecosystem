export type ModerationDecision = "allow" | "allow_sensitive" | "block" | "safety_hold";

export type ModerationCategory =
  | "abuse_violence"
  | "explicit_sexual"
  | "external_link"
  | "minor_sexual_risk"
  | "other"
  | "self_harm_suicide"
  | "sexual_health"
  | "spam_scam";

export type ModerationSeverity = "high" | "low" | "medium" | "urgent";

export type ModerationResult = {
  categories: ModerationCategory[];
  decision: ModerationDecision;
  matchedRules: string[];
  reasonCode: string;
  severity: ModerationSeverity;
};

export type ModerationInput = {
  authorRole?: string | null;
  content: string;
  targetType: "post" | "reply";
  title?: string | null;
};

type RuleMatch = {
  categories: ModerationCategory[];
  matchedRules: string[];
};

const ALLOW_RESULT: ModerationResult = {
  categories: [],
  decision: "allow",
  matchedRules: [],
  reasonCode: "no_rule_match",
  severity: "low",
};

const unique = <T>(items: T[]) => [...new Set(items)];

const hasAny = (text: string, patterns: RegExp[]) => patterns.some((pattern) => pattern.test(text));

const normalizeSpaces = (value: string) => value.replace(/\s+/g, " ").trim();

export const normalizeModerationText = (value: string) =>
  normalizeSpaces(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}@:/._+\-\s]/gu, " "),
  );

export const createModerationExcerpt = (value: string, size = 240) => {
  const normalized = normalizeSpaces(value);
  if (normalized.length <= size) return normalized;

  return `${normalized.slice(0, size - 1).trim()}…`;
};

const urlPatterns = [
  /\bhttps?:\/\/\S+/i,
  /\bwww\.\S+/i,
  /\b(?:bit\.ly|tinyurl\.com|t\.me|telegram\.me|wa\.me|whatsapp\.com|linktr\.ee|goo\.gl|cutt\.ly|shorturl\.at)\b/i,
  /\b[a-z0-9][a-z0-9-]{1,63}\s*(?:\.|\s+ponto\s+|\s+dot\s+)\s*(?:com|com\s*(?:\.|\s+ponto\s+)\s*br|br|net|org|io|app|co|me|xyz)\b/i,
  /\b(?:instagram|telegram|whatsapp|onlyfans|privacy)\s*(?:\.|\s+ponto\s+|\s+dot\s+)\s*(?:com|me)\b/i,
];

const externalContactPatterns = [
  /\b(?:me chama|chama|mande mensagem|manda mensagem|entra|me adiciona|segue|siga)\b.*\b(?:whatsapp|telegram|insta|instagram|onlyfans|privacy)\b/i,
  /\b(?:whatsapp|telegram|insta|instagram|onlyfans|privacy)\b.*\b(?:me chama|chama|dm|direct|privado)\b/i,
];

const spamPatterns = [
  /\b(?:ganhe dinheiro|renda extra|aposta|bet|cassino|pix|emprestimo|empréstimo|cupom|promocao|promoção imperdivel|investimento garantido)\b/i,
  /\b(?:vendo|compro|venda|comprar)\b.*\b(?:seguidores|curso milagroso|remedio milagroso|remédio milagroso|conta premium)\b/i,
];

const sensitiveSexualPatterns = [
  /\b(?:pornografia|porno|pornô|sexo|sexualidade|masturbacao|masturbação|masturbar|compulsao sexual|compulsão sexual|vicio em porno|vício em pornô|vicio em pornografia|vício em pornografia)\b/i,
];

const explicitSexualPatterns = [
  /\b(?:nude|nudes|pack|sexo virtual|conteudo adulto|conteúdo adulto|foto pelada|fotos peladas|video pelado|vídeo pelado|transar|gozar|boquete|safadeza)\b/i,
  /\b(?:quem quer|quero|procuro|busco|topa|vamos|bora)\b.*\b(?:sexo|transar|nudes|pack|sexo virtual)\b/i,
  /\b(?:mando|manda|envia|troco|trocar|vendo|compro|pago)\b.*\b(?:nudes|pack|foto pelada|fotos peladas|sexo|porno|pornô|conteudo adulto|conteúdo adulto)\b/i,
];

const minorPatterns = [
  /\b(?:menor de idade|menores de idade|crianca|criança|criancas|crianças|adolescente|adolescentes|pre adolescente|pre-adolescente|pré adolescente|pré-adolescente|menino|menina)\b/i,
  /\b(?:1[0-7]|[5-9])\s*anos\b/i,
];

const selfHarmSensitivePatterns = [
  /\b(?:suicidio|suicídio|suicida|me matar|tirar minha vida|acabar com minha vida|automutilacao|automutilação|me cortar|me machucar|autolesao|autolesão)\b/i,
];

const selfHarmImmediatePatterns = [
  /\b(?:vou|quero|pretendo|decidi|planejo|estou planejando|estou prestes a|nao aguento mais|não aguento mais)\b.{0,80}\b(?:me matar|suicidar|tirar minha vida|acabar com minha vida|me cortar|me machucar|automutilar|tomar remedios|tomar remédios|overdose|pular|enforcar)\b/i,
  /\b(?:hoje|agora|esta noite|essa noite|neste momento)\b.{0,80}\b(?:me matar|suicidar|tirar minha vida|acabar com minha vida|me cortar|me machucar|automutilar|overdose|pular|enforcar)\b/i,
  /\b(?:tenho um plano|ja tenho um plano|já tenho um plano|separei|comprei|peguei|estou com)\b.{0,80}\b(?:faca|lâmina|lamina|corda|remedios|remédios|veneno|arma|ponte)\b/i,
  /\b(?:como|qual|me ensina|ensinem|passo a passo|metodo|método|maneira)\b.{0,100}\b(?:me matar|suicidar|suicidio|suicídio|automutilar|me cortar|overdose)\b/i,
];

const selfHarmNegationPatterns = [
  /\b(?:nao|não)\s+(?:quero|vou|pretendo|planejo)\s+(?:me matar|suicidar|tirar minha vida|acabar com minha vida)\b/i,
  /\b(?:sem plano|nao tenho plano|não tenho plano|nunca faria isso|nao vou fazer isso|não vou fazer isso)\b/i,
];

const abuseSensitivePatterns = [
  /\b(?:abuso|abusivo|violencia|violência|agressao|agressão|assédio|assedio|estupro|trauma)\b/i,
];

const therapeuticContextPatterns = [
  /\b(?:vicio|vício|compulsao|compulsão|quero parar|preciso de ajuda|pedido de ajuda|sofrimento|sofro|vergonha|culpa|ansiedade|depressao|depressão|trauma|relato|aconteceu comigo|aconteceu no passado|pensamentos|penso|tenho medo|duvida|dúvida|como lidar|tratamento|terapia)\b/i,
];

const result = (
  decision: ModerationDecision,
  severity: ModerationSeverity,
  reasonCode: string,
  matches: RuleMatch,
): ModerationResult => ({
  categories: unique(matches.categories.length > 0 ? matches.categories : ["other"]),
  decision,
  matchedRules: unique(matches.matchedRules),
  reasonCode,
  severity,
});

const append = (matches: RuleMatch, category: ModerationCategory, rule: string): RuleMatch => ({
  categories: [...matches.categories, category],
  matchedRules: [...matches.matchedRules, rule],
});

export const moderatePatientText = (input: ModerationInput): ModerationResult => {
  if (input.authorRole !== "paciente") return ALLOW_RESULT;

  const rawText = normalizeSpaces([input.title, input.content].filter(Boolean).join(" "));
  const text = normalizeModerationText(rawText);
  let matches: RuleMatch = { categories: [], matchedRules: [] };

  if (!text) return ALLOW_RESULT;

  if (hasAny(text, urlPatterns)) {
    matches = append(matches, "external_link", "external_url_or_domain");
    return result("block", "high", "patient_external_link_blocked", matches);
  }

  if (hasAny(text, externalContactPatterns)) {
    matches = append(matches, "external_link", "external_contact_invitation");
    return result("block", "high", "external_contact_invitation_blocked", matches);
  }

  if (hasAny(text, spamPatterns)) {
    matches = append(matches, "spam_scam", "spam_or_scam_pattern");
    return result("block", "medium", "spam_or_scam_blocked", matches);
  }

  const hasSexualSensitive = hasAny(text, sensitiveSexualPatterns);
  const hasExplicitSexual = hasAny(text, explicitSexualPatterns);
  const hasMinor = hasAny(text, minorPatterns);
  if ((hasSexualSensitive || hasExplicitSexual) && hasMinor) {
    matches = append(matches, "minor_sexual_risk", "sexual_context_with_minor");
    return result("block", "high", "minor_sexual_risk_blocked", matches);
  }

  if (hasExplicitSexual) {
    matches = append(matches, "explicit_sexual", "sexual_solicitation_or_distribution");
    return result("block", "high", "sexual_solicitation_blocked", matches);
  }

  const hasSelfHarmSensitive = hasAny(text, selfHarmSensitivePatterns);
  const hasImmediateSelfHarm =
    hasSelfHarmSensitive &&
    hasAny(text, selfHarmImmediatePatterns) &&
    !hasAny(text, selfHarmNegationPatterns);
  if (hasImmediateSelfHarm) {
    matches = append(matches, "self_harm_suicide", "self_harm_immediate_intent_or_method");
    return result("safety_hold", "urgent", "self_harm_immediate_safety_hold", matches);
  }

  const hasAbuseSensitive = hasAny(text, abuseSensitivePatterns);
  if (hasSexualSensitive || hasSelfHarmSensitive || hasAbuseSensitive) {
    if (hasSexualSensitive)
      matches = append(matches, "sexual_health", "sensitive_sexual_health_term");
    if (hasSelfHarmSensitive)
      matches = append(matches, "self_harm_suicide", "sensitive_self_harm_or_suicide_term");
    if (hasAbuseSensitive)
      matches = append(matches, "abuse_violence", "sensitive_abuse_or_violence_term");

    const hasTherapeuticContext = hasAny(text, therapeuticContextPatterns);
    const reasonCode = hasTherapeuticContext
      ? "sensitive_therapeutic_context"
      : "sensitive_term_requires_admin_awareness";

    return result("allow_sensitive", "medium", reasonCode, matches);
  }

  return ALLOW_RESULT;
};

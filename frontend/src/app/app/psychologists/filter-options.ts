import type { DirectoryCatalogItem } from "@/api/generator/types/directory";
import type { FieldOption } from "@/hooks/form";

type SpecialtyCategoryOption = {
  name: string;
  slugs: readonly string[];
};

type SpecialtyCategory = {
  title: string;
  options: readonly SpecialtyCategoryOption[];
};

const SPECIALTY_CATEGORIES: readonly SpecialtyCategory[] = [
  {
    title: "Ansiedade e Transtornos Relacionados",
    options: [
      { name: "Ansiedade", slugs: ["ansiedade"] },
      { name: "Ansiedade Generalizada (TAG)", slugs: ["ansiedade-generalizada-tag"] },
      { name: "Síndrome do Pânico", slugs: ["sindrome-do-panico"] },
      { name: "Fobias", slugs: ["fobias"] },
      { name: "TOC", slugs: ["toc"] },
      { name: "Estresse", slugs: ["estresse"] },
      {
        name: "TEPT (Transtorno de Estresse Pós-Traumático)",
        slugs: ["tept-transtorno-de-estresse-pos-traumatico"],
      },
    ],
  },
  {
    title: "Humor e Saúde Mental",
    options: [
      { name: "Depressão", slugs: ["depressao"] },
      { name: "Transtorno Bipolar", slugs: ["transtorno-bipolar"] },
      { name: "Burnout", slugs: ["burnout"] },
      { name: "Tristeza Persistente", slugs: ["tristeza-persistente"] },
      { name: "Esquizofrenia", slugs: ["esquizofrenia"] },
      { name: "Transtornos de Humor", slugs: ["transtornos-de-humor"] },
    ],
  },
  {
    title: "Relacionamentos",
    options: [
      { name: "Relacionamentos", slugs: ["relacionamentos"] },
      { name: "Relacionamento Abusivo", slugs: ["relacionamento-abusivo"] },
      { name: "Conflitos Amorosos", slugs: ["conflitos-amorosos"] },
      { name: "Conflitos Familiares", slugs: ["conflitos-familiares"] },
      { name: "Casamento", slugs: ["casamento"] },
      { name: "Separação e Divórcio", slugs: ["divorcio"] },
      { name: "Dependência Emocional", slugs: ["dependencia-emocional"] },
      { name: "Ciúmes", slugs: ["ciumes"] },
    ],
  },
  {
    title: "Autoestima e Desenvolvimento Pessoal",
    options: [
      { name: "Autoestima", slugs: ["autoestima"] },
      { name: "Autoconhecimento", slugs: ["autoconhecimento"] },
      { name: "Inteligência Emocional", slugs: ["inteligencia-emocional"] },
      { name: "Desenvolvimento Pessoal", slugs: ["desenvolvimento-pessoal"] },
      { name: "Projeto de Vida", slugs: ["projeto-de-vida"] },
      { name: "Propósito", slugs: ["proposito"] },
      { name: "Motivação", slugs: ["motivacao"] },
      { name: "Autoconfiança", slugs: ["autoconfianca"] },
    ],
  },
  {
    title: "Trabalho e Carreira",
    options: [
      { name: "Carreira", slugs: ["carreira"] },
      { name: "Transição de Carreira", slugs: ["transicao-de-carreira"] },
      { name: "Produtividade", slugs: ["produtividade"] },
      { name: "Liderança", slugs: ["lideranca"] },
      { name: "Ambiente Corporativo", slugs: ["ambiente-corporativo"] },
    ],
  },
  {
    title: "Neurodivergências",
    options: [
      { name: "TDAH", slugs: ["tdah"] },
      { name: "TEA (Autismo)", slugs: ["autismo-tea"] },
      { name: "Altas Habilidades", slugs: ["altas-habilidades"] },
      { name: "Dislexia", slugs: ["dislexia"] },
      { name: "Dificuldades de Aprendizagem", slugs: ["dificuldades-de-aprendizagem"] },
    ],
  },
  {
    title: "Infância e Adolescência",
    options: [
      { name: "Psicologia Infantil", slugs: ["psicologia-infantil"] },
      { name: "Adolescência", slugs: ["adolescencia"] },
      { name: "Separação dos pais", slugs: ["separacao-dos-pais"] },
      { name: "Desenvolvimento Infantil", slugs: ["desenvolvimento-infantil"] },
      { name: "Orientação Parental", slugs: ["orientacao-parental"] },
      { name: "Bullying", slugs: ["bullying"] },
      { name: "Dificuldades Escolares", slugs: ["dificuldades-escolares"] },
      { name: "Comportamento infantil", slugs: ["comportamento-infantil"] },
    ],
  },
  {
    title: "Sexualidade e Diversidade",
    options: [
      { name: "Sexualidade", slugs: ["sexualidade"] },
      { name: "Identidade de Gênero", slugs: ["identidade-genero"] },
      { name: "Transição de gênero", slugs: ["processo-de-transicao-de-genero"] },
      { name: "Aceitação familiar", slugs: ["aceitacao-familiar"] },
      { name: "LGBTQIA+", slugs: ["lgbtqia"] },
      { name: "Sexologia", slugs: ["sexologia"] },
      { name: "Disfunções Sexuais", slugs: ["disfuncoes-sexuais"] },
    ],
  },
  {
    title: "Alimentação e Corpo",
    options: [
      { name: "Transtornos Alimentares", slugs: ["transtornos-alimentares"] },
      { name: "Anorexia", slugs: ["anorexia"] },
      { name: "Bulimia", slugs: ["bulimia"] },
      { name: "Compulsão Alimentar", slugs: ["compulsao-alimentar"] },
      { name: "Obesidade", slugs: ["obesidade"] },
      { name: "Imagem Corporal", slugs: ["imagem-corporal"] },
    ],
  },
  {
    title: "Dependências",
    options: [
      { name: "Dependência Química", slugs: ["dependencia-quimica"] },
      { name: "Dependência Tecnológica", slugs: ["dependencia-tecnologica"] },
      { name: "Jogos e Games", slugs: ["jogos-e-games"] },
      { name: "Compras Compulsivas", slugs: ["compras-compulsivas"] },
      { name: "Vícios", slugs: ["vicios"] },
    ],
  },
  {
    title: "Luto e Transições da Vida",
    options: [
      { name: "Luto", slugs: ["luto"] },
      { name: "Mudanças de Vida", slugs: ["mudancas-de-vida"] },
      { name: "Menopausa", slugs: ["menopausa"] },
      { name: "Aposentadoria", slugs: ["aposentadoria"] },
    ],
  },
  {
    title: "Saúde da Mulher e Maternidade",
    options: [
      { name: "Saúde da Mulher", slugs: ["saude-da-mulher"] },
      { name: "Gestação", slugs: ["gestacao"] },
      { name: "Puerpério", slugs: ["puerperio"] },
      { name: "Maternidade", slugs: ["maternidade"] },
      { name: "Saúde Mental Materna", slugs: ["saude-mental-materna"] },
      { name: "Pré-natal Psicológico", slugs: ["pre-natal-psicologico"] },
    ],
  },
  {
    title: "Saúde e Doenças",
    options: [
      { name: "Doenças Crônicas", slugs: ["doencas-cronicas"] },
      { name: "Câncer", slugs: ["cancer"] },
      { name: "Dor Crônica", slugs: ["dor-cronica"] },
      { name: "Cuidados Paliativos", slugs: ["cuidados-paliativos"] },
      { name: "Psicologia Hospitalar", slugs: ["psicologia-hospitalar"] },
    ],
  },
  {
    title: "Violência e Direitos Humanos",
    options: [
      { name: "Violência Doméstica", slugs: ["violencia-domestica"] },
      { name: "Violência de Gênero", slugs: ["violencia-de-genero"] },
      { name: "Violência Sexual", slugs: ["violencia-sexual"] },
      { name: "Racismo", slugs: ["racismo"] },
      { name: "Discriminação", slugs: ["discriminacao"] },
      { name: "Preconceito", slugs: ["preconceito"] },
    ],
  },
  {
    title: "Temas Gerais",
    options: [
      { name: "Comunicação", slugs: ["comunicacao"] },
      { name: "Emoções", slugs: ["emocoes"] },
      { name: "Sentimentos", slugs: ["sentimentos"] },
      { name: "Comportamento", slugs: ["comportamento"] },
      { name: "Saúde Mental", slugs: ["saude-mental"] },
    ],
  },
] as const;

const SERVICE_DISPLAY_ORDER = [
  "terapia-individual",
  "terapia-de-casal",
  "avaliacao-psicologica",
  "coach",
  "orientacao-profissional",
  "orientacao-vocacional",
  "psicologia-organizacional-e-do-trabalho",
  "neuropsicologia",
  "terapia-familiar",
  "hipnoterapia",
  "supervisao-clinica",
] as const;

const INDIVIDUAL_THERAPY_SERVICE = {
  label: "Terapia Individual",
  value: "terapia-individual",
} satisfies FieldOption;

const normalizeCatalogText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const toOptions = (items: DirectoryCatalogItem[] = []): FieldOption[] =>
  items.map((item) => ({
    label: item.name,
    value: item.slug,
  }));

const findCatalogItem = (
  option: SpecialtyCategoryOption,
  bySlug: Map<string, DirectoryCatalogItem>,
  byNormalizedName: Map<string, DirectoryCatalogItem>,
) => {
  for (const slug of option.slugs) {
    const direct = bySlug.get(slug);
    if (direct) return direct;

    const bySlugAsName = byNormalizedName.get(normalizeCatalogText(slug.replace(/-/g, " ")));
    if (bySlugAsName) return bySlugAsName;
  }

  return byNormalizedName.get(normalizeCatalogText(option.name));
};

export const toGroupedSpecialtyOptions = (items: DirectoryCatalogItem[] = []): FieldOption[] => {
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  const byNormalizedName = new Map(items.map((item) => [normalizeCatalogText(item.name), item]));
  const usedSlugs = new Set<string>();
  const groupedOptions = SPECIALTY_CATEGORIES.flatMap((category) =>
    category.options
      .map((option) => findCatalogItem(option, bySlug, byNormalizedName))
      .filter((item): item is DirectoryCatalogItem => Boolean(item))
      .filter((item) => {
        if (usedSlugs.has(item.slug)) return false;
        usedSlugs.add(item.slug);
        return true;
      })
      .map((item) => ({
        group: category.title,
        label: item.name,
        value: item.slug,
      })),
  );
  const remainingOptions = items
    .filter((item) => !usedSlugs.has(item.slug))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
    .map((item) => ({
      group: "Outras especialidades",
      label: item.name,
      value: item.slug,
    }));

  return [...groupedOptions, ...remainingOptions];
};

export const toServiceOptions = (items: DirectoryCatalogItem[] = []): FieldOption[] => {
  const orderBySlug = new Map<string, number>(
    SERVICE_DISPLAY_ORDER.map((slug, index) => [slug, index]),
  );
  const options = toOptions(items);
  const hasIndividualTherapy = options.some((option) => {
    const normalizedValue = normalizeCatalogText(String(option.value || option.label)).replace(
      /\s+/g,
      "-",
    );

    return normalizedValue === INDIVIDUAL_THERAPY_SERVICE.value;
  });

  if (!hasIndividualTherapy) {
    options.unshift(INDIVIDUAL_THERAPY_SERVICE);
  }

  return options.sort((a, b) => {
    const aKey = normalizeCatalogText(String(a.value || a.label)).replace(/\s+/g, "-");
    const bKey = normalizeCatalogText(String(b.value || b.label)).replace(/\s+/g, "-");
    const aPos = orderBySlug.get(aKey) ?? Number.POSITIVE_INFINITY;
    const bPos = orderBySlug.get(bKey) ?? Number.POSITIVE_INFINITY;

    if (aPos === bPos) {
      return a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" });
    }

    return aPos - bPos;
  });
};

export const toCatalogOptions = toOptions;

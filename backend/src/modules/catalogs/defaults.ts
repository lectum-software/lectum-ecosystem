export type SpecialtyDefault = {
  name: string;
  slug: string;
};

export type SpecialtyCategoryDefault = {
  name: string;
  slug: string;
  specialties: readonly SpecialtyDefault[];
};

export type CatalogOptionDefault = {
  name: string;
  slug: string;
};

export const DEFAULT_SPECIALTY_CATEGORIES: readonly SpecialtyCategoryDefault[] = [
  {
    name: "Ansiedade e Transtornos Relacionados",
    slug: "ansiedade-e-transtornos-relacionados",
    specialties: [
      { name: "Ansiedade", slug: "ansiedade" },
      { name: "Ansiedade Generalizada (TAG)", slug: "ansiedade-generalizada-tag" },
      { name: "Síndrome do Pânico", slug: "sindrome-do-panico" },
      { name: "Fobias", slug: "fobias" },
      { name: "TOC", slug: "toc" },
      { name: "Estresse", slug: "estresse" },
      {
        name: "TEPT (Transtorno de Estresse Pós-Traumático)",
        slug: "tept-transtorno-de-estresse-pos-traumatico",
      },
    ],
  },
  {
    name: "Humor e Saúde Mental",
    slug: "humor-e-saude-mental",
    specialties: [
      { name: "Depressão", slug: "depressao" },
      { name: "Transtorno Bipolar", slug: "transtorno-bipolar" },
      { name: "Burnout", slug: "burnout" },
      { name: "Tristeza Persistente", slug: "tristeza-persistente" },
      { name: "Esquizofrenia", slug: "esquizofrenia" },
      { name: "Transtornos de Humor", slug: "transtornos-de-humor" },
    ],
  },
  {
    name: "Relacionamentos",
    slug: "relacionamentos",
    specialties: [
      { name: "Relacionamentos", slug: "relacionamentos" },
      { name: "Relacionamento Abusivo", slug: "relacionamento-abusivo" },
      { name: "Conflitos Amorosos", slug: "conflitos-amorosos" },
      { name: "Conflitos Familiares", slug: "conflitos-familiares" },
      { name: "Casamento", slug: "casamento" },
      { name: "Separação e Divórcio", slug: "divorcio" },
      { name: "Dependência Emocional", slug: "dependencia-emocional" },
      { name: "Ciúmes", slug: "ciumes" },
    ],
  },
  {
    name: "Autoestima e Desenvolvimento Pessoal",
    slug: "autoestima-e-desenvolvimento-pessoal",
    specialties: [
      { name: "Autoestima", slug: "autoestima" },
      { name: "Autoconhecimento", slug: "autoconhecimento" },
      { name: "Inteligência Emocional", slug: "inteligencia-emocional" },
      { name: "Desenvolvimento Pessoal", slug: "desenvolvimento-pessoal" },
      { name: "Projeto de Vida", slug: "projeto-de-vida" },
      { name: "Propósito", slug: "proposito" },
      { name: "Motivação", slug: "motivacao" },
      { name: "Autoconfiança", slug: "autoconfianca" },
    ],
  },
  {
    name: "Trabalho e Carreira",
    slug: "trabalho-e-carreira",
    specialties: [
      { name: "Carreira", slug: "carreira" },
      { name: "Transição de Carreira", slug: "transicao-de-carreira" },
      { name: "Produtividade", slug: "produtividade" },
      { name: "Liderança", slug: "lideranca" },
      { name: "Ambiente Corporativo", slug: "ambiente-corporativo" },
    ],
  },
  {
    name: "Neurodivergências",
    slug: "neurodivergencias",
    specialties: [
      { name: "TDAH", slug: "tdah" },
      { name: "TEA (Autismo)", slug: "autismo-tea" },
      { name: "Altas Habilidades", slug: "altas-habilidades" },
      { name: "Dislexia", slug: "dislexia" },
      { name: "Dificuldades de Aprendizagem", slug: "dificuldades-de-aprendizagem" },
    ],
  },
  {
    name: "Infância e Adolescência",
    slug: "infancia-e-adolescencia",
    specialties: [
      { name: "Psicologia Infantil", slug: "psicologia-infantil" },
      { name: "Adolescência", slug: "adolescencia" },
      { name: "Separação dos pais", slug: "separacao-dos-pais" },
      { name: "Desenvolvimento Infantil", slug: "desenvolvimento-infantil" },
      { name: "Orientação Parental", slug: "orientacao-parental" },
      { name: "Bullying", slug: "bullying" },
      { name: "Dificuldades Escolares", slug: "dificuldades-escolares" },
      { name: "Comportamento infantil", slug: "comportamento-infantil" },
    ],
  },
  {
    name: "Sexualidade e Diversidade",
    slug: "sexualidade-e-diversidade",
    specialties: [
      { name: "Sexualidade", slug: "sexualidade" },
      { name: "Identidade de Gênero", slug: "identidade-genero" },
      { name: "Transição de gênero", slug: "processo-de-transicao-de-genero" },
      { name: "Aceitação familiar", slug: "aceitacao-familiar" },
      { name: "LGBTQIA+", slug: "lgbtqia" },
      { name: "Sexologia", slug: "sexologia" },
      { name: "Disfunções Sexuais", slug: "disfuncoes-sexuais" },
    ],
  },
  {
    name: "Alimentação e Corpo",
    slug: "alimentacao-e-corpo",
    specialties: [
      { name: "Transtornos Alimentares", slug: "transtornos-alimentares" },
      { name: "Anorexia", slug: "anorexia" },
      { name: "Bulimia", slug: "bulimia" },
      { name: "Compulsão Alimentar", slug: "compulsao-alimentar" },
      { name: "Obesidade", slug: "obesidade" },
      { name: "Imagem Corporal", slug: "imagem-corporal" },
    ],
  },
  {
    name: "Dependências",
    slug: "dependencias",
    specialties: [
      { name: "Dependência Química", slug: "dependencia-quimica" },
      { name: "Dependência Tecnológica", slug: "dependencia-tecnologica" },
      { name: "Jogos e Games", slug: "jogos-e-games" },
      { name: "Compras Compulsivas", slug: "compras-compulsivas" },
      { name: "Vícios", slug: "vicios" },
    ],
  },
  {
    name: "Luto e Transições da Vida",
    slug: "luto-e-transicoes-da-vida",
    specialties: [
      { name: "Luto", slug: "luto" },
      { name: "Mudanças de Vida", slug: "mudancas-de-vida" },
      { name: "Menopausa", slug: "menopausa" },
      { name: "Aposentadoria", slug: "aposentadoria" },
    ],
  },
  {
    name: "Saúde da Mulher e Maternidade",
    slug: "saude-da-mulher-e-maternidade",
    specialties: [
      { name: "Saúde da Mulher", slug: "saude-da-mulher" },
      { name: "Gestação", slug: "gestacao" },
      { name: "Puerpério", slug: "puerperio" },
      { name: "Maternidade", slug: "maternidade" },
      { name: "Saúde Mental Materna", slug: "saude-mental-materna" },
      { name: "Pré-natal Psicológico", slug: "pre-natal-psicologico" },
    ],
  },
  {
    name: "Saúde e Doenças",
    slug: "saude-e-doencas",
    specialties: [
      { name: "Doenças Crônicas", slug: "doencas-cronicas" },
      { name: "Câncer", slug: "cancer" },
      { name: "Dor Crônica", slug: "dor-cronica" },
      { name: "Cuidados Paliativos", slug: "cuidados-paliativos" },
      { name: "Psicologia Hospitalar", slug: "psicologia-hospitalar" },
    ],
  },
  {
    name: "Violência e Direitos Humanos",
    slug: "violencia-e-direitos-humanos",
    specialties: [
      { name: "Violência Doméstica", slug: "violencia-domestica" },
      { name: "Violência de Gênero", slug: "violencia-de-genero" },
      { name: "Violência Sexual", slug: "violencia-sexual" },
      { name: "Racismo", slug: "racismo" },
      { name: "Discriminação", slug: "discriminacao" },
      { name: "Preconceito", slug: "preconceito" },
    ],
  },
  {
    name: "Temas Gerais",
    slug: "temas-gerais",
    specialties: [
      { name: "Comunicação", slug: "comunicacao" },
      { name: "Emoções", slug: "emocoes" },
      { name: "Sentimentos", slug: "sentimentos" },
      { name: "Comportamento", slug: "comportamento" },
      { name: "Saúde Mental", slug: "saude-mental" },
    ],
  },
  {
    name: "Outras especialidades",
    slug: "outras-especialidades",
    specialties: [],
  },
] as const;

export const DEFAULT_APPROACHES: readonly CatalogOptionDefault[] = [
  { name: "TCC", slug: "tcc" },
  { name: "Psicanálise", slug: "psicanalise" },
  { name: "Gestalt-terapia", slug: "gestalt-terapia" },
  { name: "Humanista", slug: "humanista" },
  { name: "Mindfulness", slug: "mindfulness" },
  { name: "Análise do Comportamento (ABA)", slug: "analise-do-comportamento-aba" },
  { name: "Terapia Sistêmica", slug: "terapia-sistemica" },
  { name: "Terapia Breve", slug: "terapia-breve" },
];

export const DEFAULT_SERVICES: readonly CatalogOptionDefault[] = [
  { name: "Terapia Individual", slug: "terapia-individual" },
  { name: "Terapia de Casal", slug: "terapia-de-casal" },
  { name: "Avaliação Psicológica", slug: "avaliacao-psicologica" },
  { name: "Coach", slug: "coach" },
  { name: "Orientação Profissional", slug: "orientacao-profissional" },
  { name: "Orientação Vocacional", slug: "orientacao-vocacional" },
  {
    name: "Psicologia Organizacional e do Trabalho",
    slug: "psicologia-organizacional-e-do-trabalho",
  },
  { name: "Neuropsicologia", slug: "neuropsicologia" },
  { name: "Terapia Familiar", slug: "terapia-familiar" },
  { name: "Hipnoterapia", slug: "hipnoterapia" },
  { name: "Supervisão Clínica", slug: "supervisao-clinica" },
];

export const DEFAULT_LANGUAGES: readonly CatalogOptionDefault[] = [
  { name: "Português", slug: "portugues" },
  { name: "Inglês", slug: "ingles" },
  { name: "Espanhol", slug: "espanhol" },
  { name: "Francês", slug: "frances" },
  { name: "Italiano", slug: "italiano" },
  { name: "Libras", slug: "libras" },
];

export const DEFAULT_TARGET_AUDIENCES: readonly CatalogOptionDefault[] = [
  { name: "Crianças", slug: "criancas" },
  { name: "Adolescentes", slug: "adolescentes" },
  { name: "Adultos", slug: "adultos" },
  { name: "Idosos", slug: "idosos" },
  { name: "Casais", slug: "casais" },
  { name: "Famílias", slug: "familias" },
  { name: "Pessoas LGBTQIA+", slug: "lgbtqia_plus" },
];

export const DEFAULT_GENDERS: readonly CatalogOptionDefault[] = [
  { name: "Feminino", slug: "feminino" },
  { name: "Masculino", slug: "masculino" },
  { name: "Não binário", slug: "nao_binario" },
  { name: "Outro", slug: "outro" },
  { name: "Prefiro não informar", slug: "nao_informar" },
];

export const DEFAULT_RACE_COLORS: readonly CatalogOptionDefault[] = [
  { name: "Branca", slug: "branca" },
  { name: "Preta", slug: "preta" },
  { name: "Parda", slug: "parda" },
  { name: "Amarela", slug: "amarela" },
  { name: "Indígena", slug: "indigena" },
  { name: "Prefiro não informar", slug: "nao_informar" },
];

export const DEFAULT_RELIGIONS: readonly CatalogOptionDefault[] = [
  { name: "Católica", slug: "catolica" },
  { name: "Evangélica", slug: "evangelica" },
  { name: "Espírita", slug: "espirita" },
  { name: "Umbanda/Candomblé", slug: "umbanda_candomble" },
  { name: "Judaica", slug: "judaica" },
  { name: "Islâmica", slug: "islamica" },
  { name: "Budista", slug: "budista" },
  { name: "Sem religião", slug: "sem_religiao" },
  { name: "Ateu/Agnóstico", slug: "ateu_agnostico" },
  { name: "Outra", slug: "outra" },
  { name: "Prefiro não informar", slug: "nao_informar" },
];

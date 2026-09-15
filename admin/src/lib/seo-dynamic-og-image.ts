export type DynamicOpenGraphImageNotice = {
  description: string;
  fallbackDescription: string;
  previewDescription: string;
  title: string;
};

const dynamicEntityOpenGraphImageNotices = {
  community_detail: {
    description:
      "Cada comunidade usa automaticamente o próprio avatar como imagem principal do compartilhamento, em formato quadrado.",
    fallbackDescription:
      "A imagem configurada aqui permanece como fallback do template quando a comunidade não tiver avatar público.",
    previewDescription:
      "Em comunidades reais, a imagem principal será o avatar da comunidade; esta prévia mostra o fallback do template.",
    title: "Imagem personalizada por comunidade",
  },
  psychologist_profile: {
    description:
      "Cada perfil usa automaticamente a foto pública do psicólogo como imagem principal do compartilhamento, em formato quadrado.",
    fallbackDescription:
      "A imagem configurada aqui permanece como fallback do template quando o perfil não tiver foto pública.",
    previewDescription:
      "Em perfis reais, a imagem principal será a foto do psicólogo; esta prévia mostra o fallback do template.",
    title: "Imagem personalizada por perfil",
  },
} as const satisfies Record<string, DynamicOpenGraphImageNotice>;

export const getDynamicEntityOpenGraphImageNotice = (setting?: {
  page_key?: string | null;
}): DynamicOpenGraphImageNotice | null => {
  const pageKey = setting?.page_key;

  if (pageKey === "psychologist_profile" || pageKey === "community_detail") {
    return dynamicEntityOpenGraphImageNotices[pageKey];
  }

  return null;
};

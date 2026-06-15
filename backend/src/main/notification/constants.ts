import { resolve } from "@/helpers/translate/resolve";

export const messages = {
  nova_avaliacao: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.nova_avaliacao.title", data),
      body: resolve("notification.nova_avaliacao.body", data),
    };
  },
  novo_favorito: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.novo_favorito.title", data),
      body: resolve("notification.novo_favorito.body", data),
    };
  },
  visualizacao_perfil: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.visualizacao_perfil.title", data),
      body: resolve("notification.visualizacao_perfil.body", data),
    };
  },
  clique_whatsapp: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.clique_whatsapp.title", data),
      body: resolve("notification.clique_whatsapp.body", data),
    };
  },
  novo_post: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.novo_post.title", data),
      body: resolve("notification.novo_post.body", data),
    };
  },
  nova_resposta: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.nova_resposta.title", data),
      body: resolve("notification.nova_resposta.body", data),
    };
  },
  upvote: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.upvote.title", data),
      body: resolve("notification.upvote.body", data),
    };
  },
  downvote: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.downvote.title", data),
      body: resolve("notification.downvote.body", data),
    };
  },
  compartilhamento: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.compartilhamento.title", data),
      body: resolve("notification.compartilhamento.body", data),
    };
  },
  salvamento: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.salvamento.title", data),
      body: resolve("notification.salvamento.body", data),
    };
  },
};

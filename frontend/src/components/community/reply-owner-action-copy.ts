type ReplyOwnerActionCopyOptions = {
  kind: "resposta" | "comentário";
  isPsychologist: boolean;
  hasReplies: boolean;
};

export const getReplyOwnerActionCopy = ({
  kind,
  isPsychologist,
  hasReplies,
}: ReplyOwnerActionCopyOptions) => {
  const isReply = kind === "resposta";
  const subject = isReply ? "Esta resposta" : "Este comentário";
  const pronoun = isReply ? "dela" : "dele";

  return {
    deleteTitle: `Excluir ${kind}?`,
    deleteDescription: isPsychologist
      ? `${subject} e as respostas encadeadas abaixo ${pronoun} serão ${isReply ? "removidas" : "removidos"}.\n\nEsta ação não poderá ser desfeita.`
      : hasReplies
        ? `${subject} já possui respostas de outros membros.\n\nAo excluir, as respostas encadeadas abaixo ${pronoun} também serão removidas.\n\nEsta ação não poderá ser desfeita.`
        : "Esta ação não poderá ser desfeita.",
    blockedTitle: `Não é possível excluir ${isReply ? "esta resposta" : "este comentário"}`,
    blockedDescription: `${subject} já recebeu contribuições de psicólogos da comunidade.\n\nPara preservar o conteúdo compartilhado pelos profissionais, comentários e respostas que já receberam respostas de psicólogos não podem ser excluídos por pacientes.\n\nVocê pode silenciar a conversa para parar de receber novas notificações desse post.`,
    preservedTitle: isReply ? "Resposta preservada" : "Comentário preservado",
  };
};

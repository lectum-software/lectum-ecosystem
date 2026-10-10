# ADR-0580 - Respostas salvas com contexto da comunidade

## Status

Aceito.

## Contexto

As respostas salvas usavam uma linha separada `Respondido em`, distante da
identidade do autor. O perfil profissional ja oferece uma composicao mais clara:
comunidade com chevron ao lado da autoria e, em respostas profissionais, a
pergunta original dentro do video ou acima da resposta sem video.
O mesmo cabecalho do perfil tambem oferece a acao de favoritar o psicologo entre
o selo verificado e a comunidade.

## Decisao

Reutilizar `OriginalPostCommunityLink` em todas as respostas salvas e remover a
linha redundante `Respondido em`. Para respostas de psicologos, reutilizar tambem
`FeedFavoriteButton`, `ProfileReplyQuestion` e `ProfileReplyVideoQuestion`. A acao
de favorito ocupa o slot fixo usado nos cards do perfil. Os votos,
compartilhamento, remocao dos salvos, WhatsApp e navegacao do card permanecem
inalterados.

## Consequencias

Salvos e perfil profissional passam a apresentar a mesma relacao entre autoria,
comunidade e pergunta. Comentarios de pacientes ganham o mesmo chevron sem receber
o destaque de pergunta reservado a resposta profissional. Nao ha alteracao de
API, persistencia, dependencia ou rollout entre aplicacoes. Relacionado a TASK-240.

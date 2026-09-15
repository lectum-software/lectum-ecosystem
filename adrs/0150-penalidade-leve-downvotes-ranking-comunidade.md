# ADR 0150: Penalidade leve de downvotes no ranking da comunidade

## Status

Aceita

## Contexto

Posts e comentarios da comunidade eram ordenados principalmente por upvotes e recencia. Isso permitia que um conteudo com `0` upvotes e `1` downvote aparecesse acima de um conteudo neutro com `0` upvotes e `0` downvotes quando era mais recente, mesmo que o voto negativo representasse um sinal editorial util.

A Lectum nao deve expor contagem publica de downvotes, mas o sinal deve influenciar a qualidade do ranking de forma moderada para evitar enterramento agressivo ou vies de manada.

## Decisao

Usar um score de votos com penalidade leve em posts e comentarios:

```text
voteScore = upvotes_count - downvotes_count * 0,6
```

A ordenacao usa esse score antes dos desempates de recencia e id. Para comentarios, `post_reply` passa a ter `downvotes_count` denormalizado e atualizado pela mutation real de voto, com backfill dos votos ativos existentes na migracao.

O mesmo peso e aplicado em:

- posts por comunidade e feed geral;
- respostas profissionais destacadas em cards/listas;
- arvore de comentarios do detalhe do post, inclusive reordenacao client-side;
- publicacoes em perfil de psicologo.

## Consequencias

- Conteudo com `1` downvote e nenhum upvote fica abaixo de conteudo neutro em empates relevantes.
- Um conteudo com bom volume de upvotes ainda pode superar downvotes isolados.
- O downvote continua sendo um sinal interno: a contagem nao e exibida como numero publico.
- Alteracoes em `post_reply.downvotes_count` exigem manter a consistencia em votos, exclusao de conta e futuras rotinas de manutencao de contadores.

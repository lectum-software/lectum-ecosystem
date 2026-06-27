# ADR-0168: Icones azuis na central de notificacoes

## Status

Accepted

## Task relacionada

Ajuste incremental da TASK-29A/TASK-29B.

## Contexto

A central de notificacoes ja diferencia autoria em notificacoes de comunidade, mas os icones de eventos ainda usavam cores distintas por categoria. Na leitura mobile, essa variacao criava ruido visual e destoava do padrao azul predominante da Lectum. A notificacao de clique no WhatsApp tambem usava um icone generico de clique, enquanto o produto ja possui um simbolo proprio de WhatsApp reutilizado nos CTAs.

## Decisao

- Padronizar todos os icones de notificacoes com o tom azul do produto (`bg-primary-soft text-primary`).
- Reutilizar o componente `WhatsAppIcon` existente para a notificacao `clique_whatsapp`.
- Manter os icones de evento como elementos decorativos dentro do avatar/badge quando houver autor, preservando o mesmo tom azul.
- Nao criar novo asset, pacote ou componente paralelo.

## Consequencias

- A lista de notificacoes fica visualmente mais coesa e alinhada a identidade principal da Lectum.
- O clique no WhatsApp passa a ser reconhecido pelo mesmo simbolo usado em outros pontos do produto.
- A diferenciacao entre tipos de notificacao passa a depender mais do texto/icone do que de cores por categoria.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Validacao visual local da rota `/app/notifications` apos a alteracao.

## Pendencias

- Nenhuma.

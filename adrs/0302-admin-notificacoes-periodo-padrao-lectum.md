# ADR-0302: Notificações Admin com período padrão Lectum

## Status

Accepted

## Task relacionada

TASK-64, complemento de UX após TASK-76.

## Contexto

A página Admin **Notificações** recebeu um seletor de período com janelas `Últimos 7 dias`,
`Últimos 30 dias` e `Últimos 90 dias`. Após validação do usuário, essas opções foram rejeitadas
porque não correspondem ao padrão de filtros da Lectum no Admin.

O padrão vigente do Admin define `Todo o período` como default e mantém `Personalizado` somente como
estado interno acionado pela edição manual dos campos `De`/`Até`.

## Decisão

- O seletor de período de `/notificacoes` passa a expor apenas: `Hoje`, `Esta semana`, `Este mês`,
  `Este ano` e `Todo o período`.
- O default de métricas, campanhas e logs de Notificações passa a ser `Todo o período`.
- O frontend envia `period` para o backend em métricas, campanhas e logs; datas `from`/`to` são
  enviadas apenas quando o período interno é `custom`.
- O backend de Notificações aceita os mesmos presets (`all`, `today`, `week`, `month`, `year`,
  `custom`) e resolve `Todo o período` a partir do primeiro registro real de campanha ou entrega.
- `Personalizado` continua oculto no dropdown e aparece apenas como valor interno ao editar datas.

## Consequências

- A tela deixa de divergir das opções padrão da Lectum.
- `Todo o período` deixa de ser uma promessa falsa: há suporte real no backend para esse preset.
- O limite operacional do intervalo passa a ser o mesmo envelope longo usado em analytics Admin
  relacionados (até 3660 dias), sem alterar schema Prisma, migrations ou packages.

## Validação

- `pnpm --dir admin check` — OK.
- `pnpm --dir backend check` — OK.
- Validações de build e smoke local ficam registradas no complemento da TASK-64.

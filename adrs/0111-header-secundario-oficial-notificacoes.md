# ADR 0111 - Header secundario oficial baseado em Notificacoes

Data: 2026-06-16

Status: Aprovado

## Contexto

As telas secundarias da area autenticada usavam headers diferentes entre si: alguns tinham fundo branco
destacado, borda, sticky local, titulo centralizado ou acoes extras. Produto definiu que a tela
`/app/notifications` e a referencia visual oficial para essas telas, por ter um header integrado ao
layout, sem card/container, com titulo forte alinhado a esquerda e aparencia mais proxima de uma pagina
nativa.

O pedido tambem exige botao de voltar a esquerda nas telas secundarias:

- `/app/reviews`
- `/app/settings/account`
- `/app/posts/mine`
- `/app/following`
- `/app/posts/saved`

## Decisao

- Criar o componente compartilhado `SecondaryPageHeader` em `frontend/src/components/ui/secondary-page-header.tsx`.
- Reaproveitar o padrao de `/app/notifications`: `header` flex, sem fundo, sem borda, sem sombra,
  titulo `text-2xl font-extrabold tracking-tight text-foreground`.
- Permitir duas configuracoes:
  - `backHref`/`backLabel` para renderizar o botao circular discreto de voltar a esquerda.
  - `action` para preservar a acao direita de Notificacoes, como o atalho para configuracoes.
- Converter `/app/notifications` para usar o componente compartilhado, mantendo a aparencia original.
- Remover os headers antigos das telas alvo e substituir por `SecondaryPageHeader`.
- Em `Salvos`, remover a acao direita antiga de "Meus posts" para cumprir o modelo secundario unico.
- Em `Comunidades Seguidas`, substituir o titulo antigo "Seguindo" por "Comunidades Seguidas", conforme
  o nome solicitado para a familia de telas secundarias.

## Consequencias

- As telas secundarias passam a compartilhar uma linguagem visual unica e mais premium.
- O header deixa de parecer um card solto e passa a integrar diretamente o fluxo da pagina.
- O componente reduz duplicacao de markup de voltar/titulo e centraliza futuras correcoes de visual.
- A navegacao manual existente permanece preservada; nao houve mudanca de rotas, autenticacao, dados,
  backend, Prisma, migrations ou packages.
- O Builder/Quick Copy nao estava exposto como ferramenta neste ambiente; a referencia usada foi o header
  real de `/app/notifications`, que era a fonte visual solicitada.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP autenticado em mobile 390px e desktop 1280px confirmou:
  - titulo correto nas seis rotas verificadas;
  - botao de voltar em `/app/reviews`, `/app/settings/account`, `/app/posts/mine`, `/app/following` e
    `/app/posts/saved`;
  - acao de configuracoes preservada em `/app/notifications`;
  - header sem fundo, sombra, borda ou classe visual de card/container;
  - rotas permanecendo no destino esperado sem redirect indevido.

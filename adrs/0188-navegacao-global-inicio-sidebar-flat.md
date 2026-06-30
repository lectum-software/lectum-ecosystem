# ADR-0188: Navegação global com Início e sidebar desktop sem sombra

## Status

Accepted

## Task relacionada

Ajuste ad hoc solicitado pelo usuário, sem arquivo `TASK-XX` dedicado.

## Contexto

O menu privado/público compartilhado pelo `PrivateTemplate` exibia a entrada
`Comunidade` apontando para o feed canônico de comunidades. Como a própria tela
já possui seletor de comunidade, o rótulo no menu ficava redundante e menos
próximo da função real da rota: ser a entrada principal/feed inicial.

Também havia inconsistência visual no desktop: a sidebar usava sombra por
padrão, mas a tela de Psicólogos removia essa sombra por meio de
`desktopSidebarSurface="flat"`. Isso fazia a navegação global mudar de camada
visual entre seções principais.

## Decisão

- Renomear a entrada global `Comunidade` para `Início`, mantendo o destino
  `DEFAULT_COMMUNITY_FEED_HREF`.
- Remover a variação `desktopSidebarSurface` do `PrivateTemplate`.
- Padronizar a sidebar desktop sem sombra, mantendo apenas a borda lateral
  sutil como separador visual.
- Preservar a abordagem mobile-first: a alteração do rótulo vale também para a
  navegação inferior mobile, sem criar nova estrutura ou package.

## Consequências

- O menu fica mais claro: `Início`, `Psicólogos`, `Favoritos`,
  `Notificações`, `Perfil`.
- A sidebar desktop passa a ter aparência consistente em todas as seções.
- A rota e a semântica do feed de comunidades continuam intactas; apenas o
  rótulo de navegação muda.
- Caso uma área completa de comunidades com subnavegação seja criada no futuro,
  o rótulo `Comunidade` pode voltar como agrupador específico.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Validação visual local com Chrome headless em
  `http://localhost:3100/community/feed`, confirmando o item `Início` ativo e a
  sidebar desktop sem sombra.

## Pendências

- Nenhuma pendência externa.

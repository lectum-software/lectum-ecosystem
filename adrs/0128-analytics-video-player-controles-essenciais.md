# ADR-0128: Controles essenciais no player de video dos Analytics

## Status

Aceita em 2026-06-18.

## Contexto

A secao `Video de apresentacao` em Meus Analytics usa o video apenas como previa de desempenho. O player nativo do navegador exibia o menu de tres pontinhos, permitindo velocidade de reproducao, Picture-in-Picture, tela cheia e outras opcoes que nao agregam valor ao contexto analitico e deixam a interface menos premium.

## Decisao

Adicionar ao componente compartilhado `VerticalVideoPlayer` uma variante opt-in de controles minimos (`controlsVariant="minimal"`) e aplica-la apenas na tela `/app/professional/analytics`.

Essa variante usa o elemento `<video>` sem controles nativos e renderiza controles proprios restritos a:

- play/pause;
- barra de progresso com busca manual.

A variante tambem usa os atributos nativos de restricao (`controlsList`, `disablePictureInPicture`, `disableRemotePlayback`) e bloqueia o menu de contexto do video para evitar acesso a opcoes avancadas do navegador.

## Consequencias

- O video de Analytics fica mais limpo e alinhado ao uso de previa analitica.
- Os players de perfil publico, posts e outras areas continuam com o comportamento nativo existente, reduzindo risco de regressao.
- Nao foi necessario instalar pacote novo nem criar design system paralelo.
- Se futuramente Analytics precisar de volume, legendas ou controles adicionais, esses controles devem ser adicionados explicitamente na variante minimal, mantendo a experiencia sob controle do produto.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local/rota via `Invoke-WebRequest http://localhost:3000/app/professional/analytics` sem sessao autenticada retornou `307`, confirmando que a rota segue protegida pelo fluxo privado.

# ADR-0038: Redesenho do card de psicÃ³logo para proporÃ§Ã£o 9:16 com glassmorphism responsivo

## Status

Accepted

## Task relacionada

Ajuste de tela de psicÃ³logos (solicitaÃ§Ã£o operacional atual)

## Contexto

A listagem de psicÃ³logos precisa manter o mesmo card em formato vertical com proporÃ§Ã£o fixa e overlay inferior com efeito de vidro para reproduzir o padrÃ£o visual atual da tela de descoberta.

## DecisÃµes

- No componente `frontend/src/components/psychologists/psychologist-card.tsx`, o card foi reestruturado para:
  - `aspect-ratio: 9/16` via `aspectRatio: "9 / 16"`.
  - largura responsiva baseada em `100vw - 54px`, com limites `min-width: 320px` e `max-width: 380px`.
  - ajuste automÃ¡tico de largura para telas com altura menor, usando `(100dvh - 170px)` dentro da expressÃ£o de `width`, reduzindo a base horizontal para manter o card acima da barra de navegaÃ§Ã£o inferior.
  - `border-radius: 14px`, `overflow: hidden`, imagem de cobertura com `object-cover` e foco em `object-top` ocupando toda a Ã¡rea do card.
  - `badge de disponibilidade` em posiÃ§Ã£o absoluta no topo do card, com `width/height` e tipografia prÃ³ximas do protÃ³tipo (`background #FFFFFF`, radius `999`, dot `#2ECC71`, texto `10px 600`).
  - botÃ£o de favorito em posiÃ§Ã£o absoluta no topo direito com `40x40`, `bg #FFFFFF`, radius `999`, e `heart` com 22px e cor base `#64748B`.
  - overlay inferior absoluto (`bottom: 0`, `min-height: 26%`, `padding: 4.5%`) com fundo translÃºcido, `backdrop-filter`, `box-shadow` e gradiente interno para aparÃªncia de **liquid glass**.
  - retorno do controle de vÃ­deo com botÃ£o play central (`52x52`, borda `4px` branca) sobre `video_cover`/`video_url` para manter o estado de mÃ­dia.
- Mantido o uso de componentes existentes do projeto (Next `Image`, `Button`, `Link` e Ã­cones internos), sem alteraÃ§Ã£o de contratos de API nem backend.

## ConsequÃªncias

- Melhor consistÃªncia visual em mobile-first para a listagem de psicÃ³logos, sem impacto em contratos de dados.
- A regra de largura baseada em altura do viewport limita a chance do card encostar no footer/nav em telas muito baixas, reduzindo overflow visual.
- Os efeitos visuais foram concentrados no componente de UI, sem tocar em lÃ³gica de negÃ³cio.

## ValidaÃ§Ã£o

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`

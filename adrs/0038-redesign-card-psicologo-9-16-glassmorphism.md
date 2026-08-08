# ADR-0038: Redesenho do card de psicólogo para proporção 9:16 com glassmorphism responsivo

## Status

Accepted

## Task relacionada

Ajuste de tela de psicólogos (solicitação operacional atual)

## Contexto

A listagem de psicólogos precisa manter o mesmo card em formato vertical com proporção fixa e overlay inferior com efeito de vidro para reproduzir o padrão visual atual da tela de descoberta.

## Decisões

- No componente `frontend/src/components/psychologists/psychologist-card.tsx`, o card foi reestruturado para:
  - `aspect-ratio: 9/16` via `aspectRatio: "9 / 16"`.
  - largura responsiva baseada em `100vw - 54px`, com limites `min-width: 320px` e `max-width: 380px`.
  - ajuste automático de largura para telas com altura menor, usando `(100dvh - 170px)` dentro da expressão de `width`, reduzindo a base horizontal para manter o card acima da barra de navegação inferior.
  - `border-radius: 14px`, `overflow: hidden`, imagem de cobertura com `object-cover` e foco em `object-top` ocupando toda a área do card.
  - `badge de disponibilidade` em posição absoluta no topo do card, com `width/height` e tipografia próximas do protótipo (`background #FFFFFF`, radius `999`, dot `#2ECC71`, texto `10px 600`).
  - botão de favorito em posição absoluta no topo direito com `40x40`, `bg #FFFFFF`, radius `999`, e `heart` com 22px e cor base `#64748B`.
  - overlay inferior absoluto (`bottom: 0`, `min-height: 26%`, `padding: 4.5%`) com fundo translúcido, `backdrop-filter`, `box-shadow` e gradiente interno para aparência de **liquid glass**.
  - retorno do controle de vídeo com botão play central (`52x52`, borda `4px` branca) sobre `video_cover`/`video_url` para manter o estado de mídia.
- Mantido o uso de componentes existentes do projeto (Next `Image`, `Button`, `Link` e ícones internos), sem alteração de contratos de API nem backend.

## Consequências

- Melhor consistência visual em mobile-first para a listagem de psicólogos, sem impacto em contratos de dados.
- A regra de largura baseada em altura do viewport limita a chance do card encostar no footer/nav em telas muito baixas, reduzindo overflow visual.
- Os efeitos visuais foram concentrados no componente de UI, sem tocar em lógica de negócio.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`

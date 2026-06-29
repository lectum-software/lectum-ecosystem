# ADR-0181: Controles imersivos do vídeo de descoberta de psicólogos

## Status

Accepted

## Task relacionada

TASK-13/TASK-40 (ajuste pós-conclusão em `/psychologists`)

## Contexto

A página pública de descoberta de psicólogos usa um player customizado, diferente do player base dos vídeos em comunidades. A barra de progresso do player customizado aceitava seek também com a UI visível e atualizava `currentTime` continuamente durante o arraste, causando instabilidade de frame em alguns navegadores. Além disso, quando o vídeo estava mutado, somente o toque no ícone central ativava o som e entrava no modo imersivo, apesar do ícone ser apenas uma pista visual.

## Decisão

- Com UI visível, a barra de progresso permanece como indicador passivo e não recebe eventos de seek.
- Com UI escondida/imersiva, a barra de progresso vira controle interativo.
- Durante o arraste da barra imersiva, a UI atualiza apenas a prévia visual; o `currentTime` do vídeo é aplicado uma vez ao soltar.
- Quando o vídeo estiver mutado, pausado ou sem volume, tocar em qualquer área não interativa do vídeo reproduz com som e esconde a UI, mantendo o ícone central como affordance visual.

## Consequências

- Reduz conflito entre toque para entrar no modo imersivo e seek acidental com UI visível.
- Evita múltiplos seeks por movimento, diminuindo glitches de frame em mobile.
- Mantém o player customizado necessário para o feed de psicólogos sem trocar pelo player de comunidade.
- A prévia durante o arraste é visual; o frame real do vídeo é confirmado no release do controle.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`

## Pendências

- Validar manualmente em dispositivo/navegador mobile real com vídeos de psicólogos publicados para confirmar o comportamento de scrub no Safari/Chrome mobile.

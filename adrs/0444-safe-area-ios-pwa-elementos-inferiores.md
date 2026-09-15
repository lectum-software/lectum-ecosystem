# ADR-0444: Safe area iOS/PWA para elementos inferiores

## Status

Accepted

## Task relacionada

TASK-148

## Contexto

Capturas reais de iPhone comparando Lectum, LinkedIn e TikTok mostraram que a bottom nav da Lectum
ficava visualmente colada à borda inferior. O mesmo padrão aparecia em controles fixos no rodapé,
como a barra de escrever comentários/respostas. O frontend já usava `env(safe-area-inset-bottom)` em
pontos isolados, mas alguns elementos dependiam somente do inset nativo ou de paddings fixos pequenos.

Em iOS/PWA, `env(safe-area-inset-bottom)` precisa ser combinado com `viewport-fit=cover` e com um
respiro mínimo para cobrir tanto o modo instalado quanto o navegador onde o inset pode retornar `0px`.

## Decisão

Centralizar tokens globais de safe area inferior no frontend:

- `--lectum-safe-area-bottom`;
- `--lectum-bottom-fixed-padding`;
- `--lectum-bottom-fixed-padding-compact`;
- `--lectum-bottom-nav-padding`;
- `--lectum-mobile-bottom-nav-height`;
- `--lectum-mobile-bottom-nav-aware-padding`.

A bottom nav do `PrivateTemplate`, compositores de comentário/resposta, footers de edição,
compartilhamento, CTA fixo de assinatura, controles inferiores de vídeo e footer sticky de filtros
passam a consumir esses tokens. O viewport do app passa a declarar `viewportFit: "cover"` para
habilitar o tratamento correto em iOS/PWA.

Após feedback visual de 2026-08-10, a bottom nav passa a usar o token compacto
`--lectum-bottom-nav-padding`, enquanto compositores, CTAs e footers fixos continuam com
`--lectum-bottom-fixed-padding`. A separação evita uma faixa branca excessiva sob o menu e mantém a
proteção maior nos campos realmente colados à borda inferior.

## Consequências

- A navegação inferior fica mais próxima do padrão de apps sociais: ícones e labels sobem e a área do
  home indicator/safe area fica incorporada ao fundo da barra.
- Elementos inferiores mantêm respiro mínimo mesmo quando o inset nativo é `0px`.
- O conteúdo com bottom nav reserva espaço pela nova altura, reduzindo risco de sobreposição.
- O trade-off original de aumentar a área ocupada no rodapé foi recalibrado: o menu inferior usa
  padding compacto para se aproximar do LinkedIn, e apenas controles de entrada/CTA mantêm respiro maior.
- A separação de tokens reduz risco de regressão cruzada: corrigir o menu não diminui a proteção de
  compositores e corrigir compositores não volta a inflar a bottom nav.

## Produção e rollout

- Compatibilidade com dados existentes: sem impacto em dados.
- Banco/migration: sem alteração.
- Envs: nenhuma nova.
- Compatibilidade entre apps: apenas frontend muda; backend/admin antigos continuam compatíveis.
- Ordem de deploy: publicar frontend em homologação por push em `homolog`; backend e admin não exigem
  ação.
- Smoke de homologação: validar em iPhone/PWA ou viewport mobile ~390px a bottom nav, detalhe de post,
  thread de resposta e CTAs/footers inferiores.
- Rollback: reverter o commit restaura os paddings anteriores sem efeitos persistentes.

## Validação

- `pnpm check`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check:version`
- `git diff --check`
- Smoke local com `next start` e Chrome headless em viewport `390x844`, confirmando `/version`
  público em `0.1.21` e renderização mobile da rota de comunidades sem regressão estrutural.
- Pós-feedback 2026-08-10: `pnpm check:version`, `git diff --check`,
  `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm --dir admin build`, `pnpm check`
  e smoke local em `next start -p 3014`, confirmando `/version` público em `0.1.25`.

## Pendências

- Validação final em iPhone real/PWA publicado em homologação após o push automático.

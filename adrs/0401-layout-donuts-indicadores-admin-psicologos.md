# ADR-0401: Layout padronizado dos donuts de indicadores Admin

## Status

Accepted

## Task relacionada

TASK-137

## Contexto

O carrossel de donuts do dashboard Admin de Psicólogos concentrava métricas reais importantes, mas os dois primeiros cards aparentavam largura menor porque o card interno não ocupava toda a largura do wrapper. A ordem também deixava Conversão por último, apesar de ser a métrica de leitura principal solicitada pelo produto.

## Decisão

- Manter um único carrossel horizontal mobile-first para os sete donuts, sem alterar contratos de API.
- Reordenar a leitura visual para Conversão primeiro, seguida por Atividade, Cobertura, Engajamento, Visibilidade na comunidade, Vídeo de apresentação e Favoritados.
- Criar uma classe local única para o wrapper dos cards de sinais, padronizando largura responsiva e altura mínima.
- Fazer o card interno ocupar `w-full` e refinar seu visual com tokens existentes (`bg-surface`, `border-border`, `bg-primary-soft`, `text-foreground`, `text-muted`) em vez de criar componente/design system paralelo.
- Preservar SVG inline para o donut e não introduzir imagens ou dependências novas.

## Consequências

- A hierarquia prioriza Conversão sem mudar dados nem cálculos.
- Os cards passam a ter largura consistente no carrossel, inclusive nos primeiros blocos.
- A legenda fica mais escaneável, porém os cards ficam um pouco mais altos por causa das linhas arredondadas.
- A solução continua acoplada ao dashboard Admin atual e deve ser reavaliada apenas se os donuts virarem componente compartilhado entre múltiplas telas.

## Validação

- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- Browser local em `http://localhost:3002/psicologos` via Chrome/CDP desktop `1440x1000` e mobile `390x900`, validando ordem e largura padronizada dos cards.

## Pendências

- Builder/Quick Copy não estava autenticado/callable nesta execução; fallback visual usado: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e screenshot do usuário.

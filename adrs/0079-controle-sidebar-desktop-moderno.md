# ADR-0079 - Controle moderno de expandir/recolher sidebar desktop

## Status

Accepted

## Contexto

O `PrivateTemplate` usa uma sidebar desktop compartilhada pelas rotas privadas e publicamente acessiveis dentro de `/app`. O controle anterior de expandir/recolher usava icones `PanelLeftOpen`/`PanelLeftClose`, com leitura visual mais antiga e proxima de aplicativos corporativos tradicionais.

O pedido de produto foi refinar apenas a experiencia desktop, preservando exatamente a navegacao mobile atual, e aproximar o controle de referencias modernas como Notion, Linear, Slack, Arc Browser e YouTube.

## Decisao

Substituir o controle desktop da sidebar por um botao circular pequeno, com aparencia glass leve, borda discreta, sombra sutil e transicoes de 300ms. O icone passa a ser `Sidebar`, sem seta antiga dentro de quadrado.

A indicacao de estado foi resolvida sem adicionar complexidade:

- no estado expandido, o botao fica discreto (`bg-background/80`, texto muted) e o indicador interno fica deslocado para o lado esquerdo;
- no estado recolhido, o botao ganha `primary-soft`, texto primary e indicador deslocado para o lado direito, comunicando que a sidebar pode ser expandida;
- o icone aplica rotacao suave entre estados, mas continua minimalista.

O bloco superior da sidebar tambem recebeu um contorno/glass discreto para integrar logo e controle no mesmo topo visual. Em sidebar recolhida, logo e controle ficam empilhados para respeitar os 88px de largura sem parecerem soltos; em sidebar expandida, ficam em linha.

## Consequencias

- A alteracao afeta somente a sidebar desktop (`lg:flex`); a bottom navigation mobile permanece inalterada.
- Nenhum contrato de API, dado, schema, package ou fluxo de auth foi alterado.
- O controle fica mais alinhado ao restante da interface atual sem criar novo design system.
- Todas as rotas que usam `PrivateTemplate` com sidebar desktop recebem o refinamento visual de forma consistente.

## Validacoes

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP 200 em `http://127.0.0.1:3000/app/psychologists`

## Task relacionada

Ajuste complementar de UX desktop solicitado pelo usuario, relacionado ao shell privado da TASK-12 e ao uso da sidebar desktop em `/app/psychologists`.

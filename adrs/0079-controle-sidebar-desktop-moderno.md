# ADR-0079 - Controle moderno de expandir/recolher sidebar desktop

## Status

Accepted

## Contexto

O `PrivateTemplate` usa uma sidebar desktop compartilhada pelas rotas privadas e publicamente acessiveis dentro de `/app`. O controle antigo de expandir/recolher usava icones com leitura visual datada e proxima de aplicativos corporativos tradicionais.

Em 2026-06-14, o primeiro refinamento substituiu o controle por um botao circular com glass, borda e sombra. A revisao visual do produto apontou que essa solucao ainda estava grande, competia com a marca Lectum, alterava a hierarquia do cabecalho e fazia o controle parecer um elemento funcional isolado.

O pedido final e manter a mudanca apenas no desktop, preservar o mobile, e tratar o controle como uma acao secundaria quase invisivel, alinhada a referencias como Notion, Linear, Arc Browser e Slack.

## Decisao

Manter o icone `Sidebar`, mas remover a superficie destacada do controle em estado normal.

A implementacao final no desktop usa:

- cabecalho da sidebar sem cartao, borda, glass ou sombra ao redor de logo + controle;
- logo/avatar e texto `Lectum` como elemento dominante do topo;
- botao absoluto no canto superior direito do cabecalho, sem ocupar espaco relevante no flex do logo;
- area clicavel pequena (`28px`) e icone visual menor (`15px`) que o avatar/logo;
- opacidade reduzida no estado normal;
- hover/focus com fundo `surface-muted`/`primary-soft` apenas como feedback temporario;
- transicao de 200ms e rotacao discreta do icone entre expandido/recolhido.

No estado recolhido, o botao permanece no topo da sidebar e nao empilha com o logo. Isso evita quebra visual, reduz competicao com a marca e preserva a leitura premium/minimalista solicitada.

## Consequencias

- A alteracao afeta somente a sidebar desktop (`lg:flex`); a bottom navigation mobile permanece inalterada.
- O controle deixa de ter destaque persistente para funcionar como acao secundaria contextual.
- O cabecalho nao quebra linha e nao desalinha a marca Lectum.
- Nenhum contrato de API, dado, schema, package ou fluxo de auth foi alterado.
- Todas as rotas que usam `PrivateTemplate` com sidebar desktop recebem o refinamento visual de forma consistente.

## Validacoes

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP 200 em `http://127.0.0.1:3000/app/psychologists`

## Task relacionada

Ajuste complementar de UX desktop solicitado pelo usuario, relacionado ao shell privado da TASK-12 e ao uso da sidebar desktop em `/app/psychologists`.

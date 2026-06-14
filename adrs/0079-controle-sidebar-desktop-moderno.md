# ADR-0079 - Controle moderno de expandir/recolher sidebar desktop

## Status

Accepted

## Contexto

O `PrivateTemplate` usa uma sidebar desktop compartilhada pelas rotas privadas e publicamente acessiveis dentro de `/app`. O controle antigo de expandir/recolher usava icones com leitura visual datada e proxima de aplicativos corporativos tradicionais.

Em 2026-06-14, o primeiro refinamento substituiu o controle por um botao circular com glass, borda e sombra. A revisao visual do produto apontou que essa solucao ainda estava grande, competia com a marca Lectum, alterava a hierarquia do cabecalho e fazia o controle parecer um elemento funcional isolado.

Uma segunda revisao removeu a superficie destacada do controle no cabecalho, mas o produto ainda identificou que ele continuava parecendo um elemento separado do menu. A nova direcao visual pediu que o controle fosse tratado como um handle preso a propria divisoria vertical da sidebar, semelhante a Notion, Linear e Arc Browser.

O pedido final e manter a mudanca apenas no desktop, preservar o mobile, e tratar o controle como uma acao secundaria quase invisivel, alinhada a referencias como Notion, Linear, Arc Browser e Slack.

Em refinamento posterior, o handle foi mantido na divisoria, mas sua posicao vertical precisou ser corrigida para alinhar o centro do circulo ao centro visual do conjunto avatar + texto `Lectum`, sem deslocar marca ou conteudo do cabecalho.

## Decisao

Remover o controle de dentro do cabecalho da marca e renderiza-lo diretamente sobre a linha divisoria direita da sidebar desktop.

A implementacao final no desktop usa:

- cabecalho da sidebar sem botao, sem cartao, sem borda, sem glass ou sombra ao redor de logo;
- logo/avatar e texto `Lectum` como elemento dominante do topo;
- botao absoluto na borda direita do `aside`, com `translate-x-1/2`, para parecer preso ao divisor;
- diametro discreto (`24px`) e icone visual menor (`12px`) que o avatar/logo;
- seta simples `ChevronLeft` apontando para esquerda no estado expandido;
- rotacao de 180 graus da seta para indicar expansao quando o menu esta recolhido;
- superficie branca/suave com borda, sombra e opacidade discretas;
- hover/focus apenas como feedback temporario, sem competir com a marca;
- transicao de 200ms para opacidade, cor, sombra e rotacao.
- alinhamento vertical do handle pelo centro visual da marca, usando offset absoluto fora do fluxo do cabecalho para nao alterar logo/avatar/texto.

No estado recolhido, o botao continua preso a divisoria da sidebar, agora na largura de 88px. Como o controle nao participa mais do flex do cabecalho, ele nao empilha com o logo, nao reserva espaco na marca e nao provoca quebra visual.

## Consequencias

- A alteracao afeta somente a sidebar desktop (`lg:flex`); a bottom navigation mobile permanece inalterada.
- O controle deixa de ter destaque persistente para funcionar como acao secundaria contextual.
- O cabecalho nao quebra linha e nao desalinha a marca Lectum.
- O divisor lateral ganha um handle funcional integrado, reduzindo a leitura de botao solto.
- A seta deixa de parecer deslocada em relacao ao topo da marca e permanece alinhada tanto no estado expandido quanto recolhido.
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

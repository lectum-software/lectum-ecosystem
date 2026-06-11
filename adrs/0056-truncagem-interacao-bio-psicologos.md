# ADR-0056: Bio truncada e expansão inline na tela de Psicólogos

## Status

Accepted

## Task relacionada

Ajustes de UX na tela `/app/psychologists` (continuidade da refatoração imersiva da listagem).

## Contexto

A tela de descoberta de psicólogos usa vídeo/foto em tela cheia e o bloco inferior ancorado acima da navbar.
O usuário precisa pausar/reproduzir o vídeo apenas ao tocar na área livre da mídia, sem que interações no selo,
nome, subtítulo, bio, botões laterais ou navbar disparem o player.

A bio também precisa preservar o estado compacto de 2 linhas, mas permitir leitura completa sem modal, mantendo a
base do bloco acima da navbar e sem sobrepor a coluna lateral de ações.

## Decisão

Definimos para a tela `/app/psychologists`:

- limitar a bio a **2 linhas no estado recolhido**, usando `ellipsis` apenas nesse texto;
- expandir/recolher a bio **inline** ao clicar/tocar no próprio texto quando houver truncamento;
- manter o bloco inferior ancorado com `bottom` fixo acima da navbar, deixando o crescimento acontecer para cima;
- aplicar `max-height` e rolagem interna na bio expandida para evitar invasão da navbar ou da coluna lateral;
- tornar o nome do psicólogo clicável, navegando para a rota de perfil já usada no botão lateral;
- separar zonas de interação para que mídia livre controle o vídeo e elementos de UI interceptem o toque/clique.

## Consequências

- O vídeo não pausa quando o usuário interage com nome, bio, selos, subtítulo, botões laterais ou navegação.
- A leitura completa da bio não depende de modal/bottom sheet e preserva a experiência imersiva.
- O nome não recebe `ellipsis`; apenas a bio usa truncamento visual no estado recolhido.
- Biografias muito longas continuam acessíveis por rolagem interna da bio expandida, sem empurrar a navbar.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Validação local da rota `/app/psychologists` em servidor Next, garantindo resposta HTTP e preservação da tela.

## Pendências

- Validar futuramente em dispositivo real se a área de mídia livre deve excluir também espaços vazios do bloco inferior
  ou se o comportamento atual de bloqueio por camada textual é suficiente para a UX final.

## Atualizacao 2026-06-11: guias laterais da tela imersiva

A tela `/app/psychologists` passa a manter guias laterais consistentes:

- barra de busca, selos flutuantes e bloco textual inferior compartilham a mesma margem esquerda;
- botao de filtros e coluna lateral de acoes compartilham a mesma guia direita;
- a mudanca e apenas visual, sem alterar dados, API, navbar ou comportamento dos botoes.

## Atualizacao 2026-06-11: reducao da margem esquerda

A guia esquerda da tela `/app/psychologists` foi reduzida para aproximar barra de busca, selos flutuantes e bloco textual da borda esquerda, preservando o alinhamento entre esses elementos e sem alterar a guia direita, navbar, dados ou acoes.

## Atualizacao 2026-06-11: zona inferior neutra do player

A faixa transparente entre a base da bio e a navbar em `/app/psychologists` passou a interceptar cliques/toques sem executar acao, impedindo que essa area acione play/pause do video. A area livre da midia acima do bloco informativo continua controlando o player.

## Atualizacao 2026-06-11: modal de filtros pausa o video

Ao abrir a modal de filtros em `/app/psychologists`, o video de fundo em reproducao passa a ser pausado e o estado local do player fica marcado como pausado. O fechamento da modal nao retoma o video automaticamente; a retomada permanece sob controle explicito do usuario pela area livre da midia.

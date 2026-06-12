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

## Atualizacao 2026-06-11: refinamento de perfil público do psicólogo

No fluxo de `/app/psychologist/[id]`, o comportamento visual e de interação da bio foi padronizado com a regra de truncagem inline:

- O card principal (hero) foi reorganizado com mídia de destaque, botões de voltar/compartilhar e card branco ancorado;
- O nome permanece sem `ellipsis`, com o selo verificado agregado à última palavra visível;
- Bio inicial em 2 linhas com `ellipsis`, expandindo/recolhendo inline no clique no texto;
- Sem modal ou bottom sheet para leitura completa da bio, preservando continuidade da página;
- Manutenção da mesma política de áreas clicáveis no topo para evitar acionar reações de mídia fora da área livre.

## Atualizacao 2026-06-12: alternancia por scroll no feed imersivo

A tela `/app/psychologists` passou a manter um indice ativo local sobre a pagina de resultados retornada pela API. Eventos de wheel/scroll vertical e swipe vertical alternam entre os psicologos carregados sem criar dados artificiais nem alterar o contrato do endpoint. Ao chegar ao fim/inicio da pagina atual, a tela usa a paginacao real existente (`page`/`limit`) para carregar a proxima/anterior quando houver.

Para preservar as zonas de interacao ja decididas:

- clique/tap na midia livre continua controlando play/pause;
- swipe vertical sobre a tela navega o feed e nao deve disparar play/pause residual;
- campos de busca, modal de filtros e bio expandida bloqueiam a navegacao por scroll para permitir edicao/rolagem interna;
- ao trocar o psicologo ativo, estado de bio expandida, falha de video e feedback de compartilhamento volta ao estado inicial.

## Atualizacao 2026-06-12: padronizacao visual do botao WhatsApp

O botao lateral de WhatsApp em `/app/psychologists` deve manter o mesmo visual em todos os psicologos exibidos no feed imersivo, usando como referencia o primeiro botao criado na tela: circulo `#22C55E` com `WhatsAppIcon` branco e label `WhatsApp`.

Quando o profissional ainda nao possui `whatsapp_url` no contrato publico, o botao permanece visualmente identico, mas fica semanticamente marcado como indisponivel (`aria-disabled`) e intercepta o clique/toque para nao acionar o player de video por propagacao.

## Atualizacao 2026-06-12: favoritar e compartilhar sem fundo branco

Os botoes laterais de favoritar e compartilhar em `/app/psychologists` deixam de usar circulo branco de fundo e passam a renderizar os icones em branco sobre o video. O estado favoritado preserva o vermelho como indicador de selecao, mas o estado neutro deixa de usar cinza.

## Atualizacao 2026-06-12: feed vertical com scroll-snap

A alternancia entre psicologos em `/app/psychologists` passa a usar um feed vertical real com `scroll-snap`:

- cada psicologo da pagina de resultados da API e renderizado como um slide proprio de `100dvh`;
- video/fallback, busca, botao de filtros, selos, gradiente, bloco de texto e botoes laterais ficam dentro do slide, entao sobem/descem junto durante a rolagem;
- a navbar do `PrivateTemplate` permanece compartilhada e global, preservando o padrao do shell privado;
- o indice ativo agora e detectado pela posicao de `scrollTop` no container, sem troca brusca por wheel/swipe manual;
- ao trocar o slide ativo, os estados locais de UI existentes voltam ao padrao: bio recolhida, feedback de compartilhamento fechado, player retomavel e alinhamento da coluna lateral recalculado;
- videos fora do slide ativo sao pausados e apenas o video ativo responde a play/pause, mute/unmute e falha de carregamento.

Essa decisao substitui a alternancia anterior por eventos de wheel/touch, que trocava o conteudo instantaneamente e nao fazia a tela inteira acompanhar o movimento.

# ADR-0056: Bio truncada e expansÃ£o inline na tela de PsicÃ³logos

## Status

Accepted

## Task relacionada

Ajustes de UX na tela `/app/psychologists` (continuidade da refatoraÃ§Ã£o imersiva da listagem).

## Contexto

A tela de descoberta de psicÃ³logos usa vÃ­deo/foto em tela cheia e o bloco inferior ancorado acima da navbar.
O usuÃ¡rio precisa pausar/reproduzir o vÃ­deo apenas ao tocar na Ã¡rea livre da mÃ­dia, sem que interaÃ§Ãµes no selo,
nome, subtÃ­tulo, bio, botÃµes laterais ou navbar disparem o player.

A bio tambÃ©m precisa preservar o estado compacto de 2 linhas, mas permitir leitura completa sem modal, mantendo a
base do bloco acima da navbar e sem sobrepor a coluna lateral de aÃ§Ãµes.

## DecisÃ£o

Definimos para a tela `/app/psychologists`:

- limitar a bio a **2 linhas no estado recolhido**, usando `ellipsis` apenas nesse texto;
- expandir/recolher a bio **inline** ao clicar/tocar no prÃ³prio texto quando houver truncamento;
- manter o bloco inferior ancorado com `bottom` fixo acima da navbar, deixando o crescimento acontecer para cima;
- aplicar `max-height` e rolagem interna na bio expandida para evitar invasÃ£o da navbar ou da coluna lateral;
- tornar o nome do psicÃ³logo clicÃ¡vel, navegando para a rota de perfil jÃ¡ usada no botÃ£o lateral;
- separar zonas de interaÃ§Ã£o para que mÃ­dia livre controle o vÃ­deo e elementos de UI interceptem o toque/clique.

## ConsequÃªncias

- O vÃ­deo nÃ£o pausa quando o usuÃ¡rio interage com nome, bio, selos, subtÃ­tulo, botÃµes laterais ou navegaÃ§Ã£o.
- A leitura completa da bio nÃ£o depende de modal/bottom sheet e preserva a experiÃªncia imersiva.
- O nome nÃ£o recebe `ellipsis`; apenas a bio usa truncamento visual no estado recolhido.
- Biografias muito longas continuam acessÃ­veis por rolagem interna da bio expandida, sem empurrar a navbar.

## ValidaÃ§Ã£o

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- ValidaÃ§Ã£o local da rota `/app/psychologists` em servidor Next, garantindo resposta HTTP e preservaÃ§Ã£o da tela.

## PendÃªncias

- Validar futuramente em dispositivo real se a Ã¡rea de mÃ­dia livre deve excluir tambÃ©m espaÃ§os vazios do bloco inferior
  ou se o comportamento atual de bloqueio por camada textual Ã© suficiente para a UX final.

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

## Atualizacao 2026-06-11: refinamento de perfil pÃºblico do psicÃ³logo

No fluxo de `/app/psychologist/[id]`, o comportamento visual e de interaÃ§Ã£o da bio foi padronizado com a regra de truncagem inline:

- O card principal (hero) foi reorganizado com mÃ­dia de destaque, botÃµes de voltar/compartilhar e card branco ancorado;
- O nome permanece sem `ellipsis`, com o selo verificado agregado Ã  Ãºltima palavra visÃ­vel;
- Bio inicial em 2 linhas com `ellipsis`, expandindo/recolhendo inline no clique no texto;
- Sem modal ou bottom sheet para leitura completa da bio, preservando continuidade da pÃ¡gina;
- ManutenÃ§Ã£o da mesma polÃ­tica de Ã¡reas clicÃ¡veis no topo para evitar acionar reaÃ§Ãµes de mÃ­dia fora da Ã¡rea livre.

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

## Atualizacao 2026-06-12: gestos imersivos do video

A tela `/app/psychologists` passou a separar a area livre de midia dos elementos de UI para suportar gestos de video:

- toque simples na area livre alterna `isUiHidden`, escondendo busca, filtros, selos, texto, botoes laterais, navbar global e todos os gradientes/sombreamentos do slide;
- duplo toque cancela o toque simples e chama a mesma logica de favorito do botao lateral, com feedback visual breve;
- pressionar e segurar cancela toque simples/duplo toque, pausa temporariamente o video ativo e retoma ao soltar quando o video estava tocando;
- a navbar global do `PrivateTemplate` recebeu uma prop opcional `navigationHidden`, usada apenas pela tela imersiva para sumir junto da UI sem criar uma navbar local;
- ao trocar o psicologo ativo no feed, timeouts e estados transitorios de gesto sao limpos, `isUiHidden` volta para `false` e a nova tela abre com UI visivel.

Os elementos interativos existentes permanecem com suas proprias acoes e nao propagam gesto para a area de video.

## Atualizacao 2026-06-12: coluna lateral apenas com icones

A coluna lateral de acoes em `/app/psychologists` deixa de exibir labels visiveis abaixo dos botoes. Os textos
`Favoritar`, `Compartilhar`, `WhatsApp` e `Perfil` foram removidos do layout visual, mantendo apenas `aria-label`
para acessibilidade e preservando as acoes existentes.

Para compensar a ausencia dos fundos brancos em favoritar/compartilhar, os icones de coracao e compartilhar usam uma
escala interna maior dentro do mesmo container, aproximando o peso visual dos botoes de WhatsApp e Perfil sem alterar
o tamanho dos containers nem a responsividade da coluna.

## Atualizacao 2026-06-12: compactacao do espacamento da coluna lateral

Depois da remocao dos labels, o espacamento vertical entre os botoes laterais foi reduzido em aproximadamente 10% a
15% (`14px -> 12px` em telas compactas e `18px -> 16px` nas demais). A mudanca compensa a ausencia dos textos e
mantem a coluna mais agrupada sem alterar tamanho dos containers, posicao geral, acoes ou responsividade.

## Atualizacao 2026-06-12: onboarding de swipe

A tela `/app/psychologists` passa a ensinar a navegacao vertical com uma dica leve e temporaria:

- usuarios sem `lectum:psychologists:has-seen-swipe-hint` em `localStorage` veem a mensagem "Deslize para descobrir novos psicologos" acima da navbar, centralizada e com seta para cima;
- a dica aparece por 3 segundos na primeira exibicao elegivel, flutua suavemente e nao intercepta cliques;
- o slide ativo recebe uma unica animacao sutil de nudge vertical (`-8px` e retorno) para reforcar a descoberta do gesto;
- se nao houver interacao nos primeiros 5 segundos do primeiro video, a dica reaparece por 2 segundos;
- o primeiro swipe vertical bem-sucedido marca a chave local como vista, oculta a dica e impede novas exibicoes automaticas.

Timers e estados da dica sao limpos no unmount e quando a dica e marcada como vista.

## Atualizacao 2026-06-12: hierarquia tipografica do bloco inferior

A tela `/app/psychologists` refinou a hierarquia visual do bloco inferior para equilibrar a descoberta com o modo imersivo:

- o nome do psicologo passa a ser o texto principal, com 16-17px, peso 700 e linha de 20px, mantendo quebra natural sem `ellipsis`;
- o selo verificado permanece agrupado com a ultima palavra do nome, em 12-14px, evitando ficar isolado em uma linha propria;
- profissao/experiencia e avaliacao foram reduzidas para escala secundaria, com texto em 11-12px e pill de nota compacta;
- a bio passa a usar 12px/16px, mostra ate 4 linhas sem `ellipsis` e usa `Ver mais`/`Ver menos` para expansao inline quando ultrapassa esse limite;
- o selo `Disponivel hoje` foi compactado para 10-11px e deixa de competir com o nome;
- o gradiente inferior ficou mais sutil, preservando legibilidade sem dominar a midia.

A expansao da bio continua crescendo para cima por causa do bloco ancorado acima da navbar, sem alterar navbar, video, busca, filtros, coluna lateral, gestos, favoritos ou navegacao para perfil.

## Atualizacao 2026-06-12: busca e filtro fixos no feed vertical

A tela `/app/psychologists` separa a camada global de busca/filtros da camada de slides do feed vertical:

- a barra de busca e o botao de filtros sao renderizados uma unica vez no container principal, fora do `map` de psicologos;
- durante o `scroll-snap`, apenas video, overlays, selo, nome, bio, avaliacao e coluna lateral pertencentes ao psicologo sobem/descem com o slide;
- busca e filtro permanecem ancorados no topo do viewport do feed, com z-index acima da midia, permitindo que os videos passem por tras;
- quando `isUiHidden=true`, a camada global tambem fica invisivel e sem eventos; ao trocar de slide, o reset existente de `isUiHidden=false` faz busca/filtro reaparecerem;
- a modal de filtros continua acima dessa camada global e pausa o video ativo ao abrir.

Essa decisao evita recriar busca/filtro por item do feed e preserva as interacoes, sugestoes de busca, filtros, gestos e navegacao existentes.

## Atualizacao 2026-06-12: barra de progresso interativa do video

A tela `/app/psychologists` passa a ter uma barra de progresso por slide de video, inspirada em TikTok/Reels e adaptada ao contexto Lectum:

- cada slide com video renderiza sua propria barra na base da midia, entao ela acompanha a rolagem vertical junto com o video e demais informacoes do psicologo;
- a barra mostra progresso em tempo real usando `currentTime` e `duration`, sincronizada por eventos do video e por `requestAnimationFrame` no video ativo;
- toque/click na barra executa seek imediato; arraste atualiza o progresso visual e o tempo do video continuamente;
- a barra intercepta seus proprios eventos com `stopPropagation`/`preventDefault`, cancelando timeouts pendentes de toque/long press para nao ocultar UI, favoritar, pausar ou disparar scroll do feed;
- quando a UI esta oculta, a barra permanece visivel e funcional no rodape da midia; busca, filtros, texto, botoes, gradientes e navbar continuam ocultos;
- quando a UI esta visivel, o bloco textual fica mais alto para reservar espaco para a barra acima da navbar, evitando cobertura de bio, nome ou botoes laterais.

A busca e o botao de filtros permanecem globais/fixos no topo; a barra pertence ao slide por ser especifica do video exibido.

## Atualizacao 2026-06-12: prioridade de gestos e primeiro toque com som

A tela `/app/psychologists` refinou a prioridade dos gestos sobre a area livre do video:

- long press usa janela de 520ms, captura o ponteiro do slide ativo, pausa diretamente o video atual e cancela qualquer toque simples pendente;
- ao soltar depois de long press, o video volta a reproduzir e o gesto nao favorita, nao altera a UI e nao muda mute/unmute;
- o primeiro toque simples em video ainda mudo desmuta o player ativo, mantem a reproducao e oculta a UI de uma vez;
- depois do primeiro toque, o estado global fica com som e os toques simples seguintes voltam a apenas alternar a UI imersiva;
- duplo toque continua com prioridade sobre toque simples e apenas aciona favorito/desfavorito com feedback visual;
- a barra de progresso permanece com prioridade propria, bloqueando propagacao e cancelando timers de toque/long press durante seek.

Essa decisao preserva autoplay inicial em mute, mas evita que o icone de mute continue poluindo a tela depois da primeira interacao real do usuario.

## Atualizacao 2026-06-12: favoritos silenciosos no feed imersivo

A experiencia imersiva de `/app/psychologists` nao deve exibir notificacoes textuais de sucesso ao favoritar ou desfavoritar profissionais.

A decisao foi aplicar a mudanca na requisicao compartilhada de favoritos do paciente: `favoritePsychologist` e `unfavoritePsychologist` continuam usando os endpoints reais e a camada de cache/mutacao existente, mas nao passam mais `showSuccess` para `handleReq`.

Com isso:

- a acao permanece persistida e sincronizada com a tela de Favoritos;
- o feedback visual fica restrito ao icone de coracao e a animacao do duplo toque no feed;
- mensagens verdes de sucesso deixam de competir com o video e nao quebram o modo imersivo;
- erros seguem pelo fluxo global de erro do `handleReq`, pois a solicitacao removeu apenas o feedback textual de sucesso.

## Atualizacao 2026-06-12: hierarquia visual premium do bloco inferior

A tela `/app/psychologists` refinou a hierarquia do bloco inferior sem mexer na estrutura global do feed imersivo.

Decidimos tratar o nome como principal ancora textual do slide, aumentando-o para 17-18px com peso 700, enquanto profissao/experiencia e avaliacao ficam em escala secundaria. A bio permanece legivel em 12px, mas com line-height de 17px e truncagem inicial em 2 linhas para equilibrar leitura e area livre de video.

O selo `Disponivel hoje` mantem seu tamanho atual, mas recebe mais espaco abaixo para funcionar como indicador secundario. O selo verificado permanece agrupado ao nome por `inline-flex` com `nowrap`, preservando a regra de nao ficar sozinho em uma linha.

A decisao preserva chips superiores, busca, filtro, navbar, coluna lateral, gestos e dados reais do psicologo, alterando apenas escala e espacamentos do bloco textual inferior.

## Atualizacao 2026-06-12: microcopy da busca principal

A barra de busca global de `/app/psychologists` passa a usar o placeholder mais generico `Busque psicólogos`, reduzindo ruido visual no feed imersivo.

A mudanca e apenas de microcopy: a busca continua aplicando o mesmo parametro textual, mantendo sugestoes, filtros, rota, dados reais da API e comportamento de busca por nome/CRP sem alterar contrato tecnico.

## Atualizacao 2026-06-12: foco prioritario da busca

A busca global de `/app/psychologists` passa a ter prioridade sobre a experiencia imersiva quando recebe foco.

A decisao foi pausar o video ativo no proprio `HTMLVideoElement`, preservando `currentTime`, e manter uma flag local para retomar apenas se o video estava reproduzindo antes da busca. O modo focado adiciona um overlay dentro da tela, bloqueia scroll e gestos do feed, e eleva busca/filtro acima do restante do conteudo.

Para manter a navbar visivel sem competir com a busca, o `PrivateTemplate` recebeu a prop opcional `navigationDimmed`, que reduz opacidade/saturacao e remove eventos apenas quando uma tela solicitar. O comportamento default das demais rotas permanece inalterado.

## Atualizacao 2026-06-12: barra de progresso como controle real do video

A barra de progresso de `/app/psychologists` passa a ser tratada como controle prioritario do player, nao apenas como indicador visual.

A decisao foi pausar o `HTMLVideoElement` no inicio do scrubbing, guardar se ele estava reproduzindo antes da interacao e retomar apenas nessa condicao ao soltar. Durante o arraste, o seek e aplicado diretamente em `video.currentTime`, atualizando o frame e o estado local de progresso em tempo real.

A barra fica sem margens laterais e usa o token `primary` como azul Lectum. Com UI visivel, sua linha visual fica encostada no topo da navbar; com UI oculta, permanece no rodape da viewport, mantendo o modo imersivo com apenas video e progresso.

Essa decisao preserva os gestos existentes porque a barra captura seus proprios eventos com `stopPropagation`, `preventDefault`, `touch-action: none` e captura de ponteiro. Assim, interagir com ela nao dispara single tap, double tap, long press, scroll vertical, favorito ou alternancia de UI.

## Atualizacao 2026-06-12: tolerancia de movimento no long press

O gesto de pressionar e segurar em `/app/psychologists` passa a diferenciar microdeslocamento involuntario de intencao real de navegacao.

A decisao foi introduzir uma tolerancia de 20px para preservar o timer e o estado de long press enquanto o dedo/mouse oscila pouco. Movimentos acima dessa tolerancia apenas suprimem clique acidental; o long press so e cancelado quando ha deslocamento vertical dominante ou drag significativo.

Se o video ja estiver pausado por long press, pequenos movimentos continuam mantendo a pausa. Quando o usuario inicia um swipe/drag claro para navegar, o estado de long press e encerrado, a captura do ponteiro e liberada e o video volta a reproduzir para permitir a rolagem do feed.

## Atualizacao 2026-06-12: bio completa sem truncamento

A decisao mais recente de produto para `/app/psychologists` substitui a regra anterior de truncagem/expansao da bio.

A bio passa a ser exibida integralmente direto no bloco inferior, sem `Ver mais`, `Ver menos`, ellipsis, line-clamp, `max-height`, medicao de linhas ou modal/bottom sheet. A justificativa e que a tela ja possui modo imersivo: um toque oculta a UI e preserva o video, entao a leitura completa da bio tem prioridade sobre economizar altura fixa.

A implementacao mantém o bloco ancorado acima da navbar; bios maiores crescem para cima e continuam dentro da coluna textual, sem invadir a coluna lateral de acoes. O texto ainda bloqueia propagacao de pointer/click para nao acionar gestos do video ao tocar na bio, mas nao executa nenhuma interacao propria.

## Atualizacao 2026-06-12: indicador Disponivel hoje discreto

O indicador `Disponivel hoje` em `/app/psychologists` deixa de ser tratado visualmente como badge ou botao.

A decisao foi remover fundo, pill, padding de destaque e animacoes, mantendo apenas uma bolinha verde pequena e texto em verde claro. Assim, disponibilidade vira metadado complementar do card, enquanto o nome do psicologo permanece como principal ancora textual do bloco inferior.

## Atualizacao 2026-06-12: microcopy Buscar psicologos

A busca global de `/app/psychologists` passa a usar o placeholder `Buscar psicólogos`, substituindo `Busque psicólogos`.

A decisao e apenas de microcopy e nao altera contrato de busca, filtros, sugestoes, dados reais da API ou comportamento de foco da barra.

## Atualizacao 2026-06-12: reset de video ao trocar psicologo ativo

A experiencia do feed de `/app/psychologists` passa a tratar cada entrada no viewport como uma nova exibicao do video.

A decisao foi resetar todos os elementos `<video>` do feed sempre que a chave do video ativo muda. Videos inativos sao pausados e enviados para `currentTime = 0`; o novo video ativo tambem e enviado para o inicio antes de reproduzir. A barra de progresso global do slide ativo e zerada junto com o preview de scrubbing.

Isso evita que, ao voltar para um psicologo ja assistido, o video continue do ponto anterior. A navegacao vertical passa a se comportar como uma lista de exibicoes completas, com cada video iniciando do comeco ao entrar novamente como ativo.

## Atualizacao 2026-06-12: UI invisivel inativa no modo imersivo

O modo imersivo de `/app/psychologists` passa a tratar UI oculta como UI realmente inativa, nao apenas transparente.

A decisao foi aplicar uma classe inert propria nos wrappers de busca/filtro e do slide quando `isUiHidden=true`, com `pointer-events: none` tambem para todos os descendentes. Isso corrige casos em que filhos com `pointer-events-auto` continuavam clicaveis mesmo com o wrapper invisivel.

Elementos interativos ocultos tambem recebem `disabled` ou `tabIndex=-1` quando aplicavel. Assim, nome, selo verificado, bio, profissao, avaliacao, disponibilidade, botoes laterais, busca e filtro deixam de receber clique/foco no modo sem UI. Apenas a area do video e a barra de progresso continuam interativas.

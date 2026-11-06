# ADR-0680 - Legendas experimentais por video

Status: implementacao local parcial, nao aprovada para publicacao.

## Correcao de concorrencia descoberta na validacao (2026-11-06)

Player pode emitir eventos simultaneos para a mesma sessao de visualizacao.
O read/create anterior produzia P2002; read/update tambem podia perder maximos.
ProfileVideoWatchRepository agora serializa read/merge/write com advisory lock
transacional PostgreSQL, chave hash de namespace/profissional/sessao, e isolamento
ReadCommitted. Colisao de hash apenas serializa sessoes independentes; nao mistura
dados. Lock liberado no commit/rollback, sem dependencia de memoria do processo.
Sem migration ou mudanca de contrato. Teste de banco real com oito chamadas e
repeticao do perfil no navegador passaram; fixtures locais removidas.
Data: 2026-11-05.

## Decisao

Persistir os trechos com tempos, revisao otimista e data de revisao em uma
tabela aditiva ligada a video_asset. O usuario autorizou a migracao somente
no banco local isolado. Nenhuma migracao remota foi autorizada.

VIDEO_CAPTIONS_ASSET_IDS e uma allowlist explicita, vazia por padrao, sem
wildcard. Nao existe geracao global nem processamento em massa. O POST de
geracao nao e repetido automaticamente depois de resultado incerto.

Usar node-webvtt 1.9.4 para interpretar WebVTT, seguido de validacao Zod
de texto, quantidade, ordem, duracao e sobreposicao. Nao interpretar tags
como HTML. Chamadas Cloudflare ficam no backend, com timeout e limite de
1 MiB por resposta. Nenhum segredo e devolvido ao cliente.

Apenas o proprietario psicologo pode editar. Salvar incrementa a revisao e
marca como revisada automaticamente. O mesmo documento alimenta player e
HTML publico. Autorizacao anonima do video precede a transcricao publica;
dados profissionais sao incluidos apenas de perfil publicado e nao excluido.

O player reutiliza TextTrack/VTTCue para sincronizacao, sem loop de polling
por frame. CC controla uma camada visual. A faixa inferior do player e
medida para evitar sobreposicao com WhatsApp.

## Limites e pendencias

- Em 2026-11-05, usuario autorizou uma copia exclusiva de verification-v1.mp4,
  fez upload e geracao pt no painel e entregou pt.vtt. Parser e player local
  aceitaram os 7 trechos reais. API autenticada ainda nao testada.
- Precisao, custo efetivo e comportamento com audio ruim ainda nao medidos.
- O editor e o player precisam de validacao visual e funcional integrada.
- A exibicao publica atual usa details na pagina existente; integracao exata
  com menu e posicionamento abaixo do video ainda pendentes.
- Exportacao MP4 com tres opcoes implementada e testada via botao local;
  equivalencia sob carga e validacao externa continuam pendentes.
- Texto falado pode conter dados pessoais: revisar videos de teste antes de
  habilitar publicacao de transcricoes, mesmo que o autor do post seja anonimo.
- Licenca do PNG de CC para publicacao sem atribuicao ainda nao confirmada.

## Rollout

Complemento: o endpoint SEO do perfil inclui somente legendas autorizadas
do video de apresentacao. A pagina publica renderiza texto acessivel em
sr-only, sem nova aba visual; reels mantem CC e a transcricao canonica no
post/resposta. Nao se promete indexacao de texto oculto. Plano operacional
e gates pendentes em _product/tasks/VIDEO-CAPTIONS-ROLLOUT.md.

Nao publicar este lote como funcionalidade completa. Antes de qualquer
publicacao: concluir testes integrados, revisar privacidade, confirmar licenca,
aprovar um video de teste e testar exportacao equivalente. Aplicar migracao
aditiva antes de habilitar qualquer ID. Manter allowlist vazia permite rollback
funcional sem apagar dados ou alterar players sem legendas.

Referencias tecnicas: https://developers.cloudflare.com/api/resources/stream/subresources/captions/

## Complemento: exportacao e automacao isoladas

Reutilizar fila/worker e FFmpeg existentes. Metadados incluem modo e cues
validados do banco; ASS temporario e removido ao terminar, sem shell. Nao
aceitar legenda enviada pelo cliente nem retornar silenciosamente ao modo
de identificacao. Conferir revisao para evitar exportar texto obsoleto.
Manter os tres modos mutuamente exclusivos e preservar a arte superior.

Automacao depende de VIDEO_CAPTIONS_AUTO_ENABLED=true mais allowlist de ate
10 IDs; default off. Polling no backend, nunca durante navegacao. Estado do
banco permite retomada apos reinicio; POST tem lock unico e nao tem retry
automatico em falha ambigua. Polling para apos 24h para limitar chamadas;
operador deve investigar e sincronizar manualmente, sem regenerar cegamente.
Inicialmente este caminho nao havia sido testado contra a API real.

Variaveis opcionais de fonte VIDEO_SOCIAL_BOLD_FONT_PATH e
VIDEO_SOCIAL_REGULAR_FONT_PATH permitem Manrope no Windows local sem mudar
o fallback Linux. Redis e worker locais isolados, sem instalar servico no
sistema e sem reutilizar filas de producao. Evidencias/limites na task.

## Configuracao e evidencia real em 2026-11-06

Extrair getVideoStreamApiConfig da configuracao Stream existente para
operacoes REST de captions. Elas nao usam chave privada, customer code,
origens de playback ou segredo de webhook. getVideoStreamConfig preserva
todas essas exigencias para upload/playback; mesma habilitacao e timeout.
Allowlist e opt-in da automacao continuam obrigatorios e default off.

Uma copia remota foi criada com autorizacao explicita e recebeu um unico
POST de geracao pt. Sete cues validos, identicos ao original. Depois, teste
local de recuperacao usou scheduler, banco e adaptador reais para sincronizar
essa copia via GET e preservar revisao manual. Nenhum novo POST nesse teste.
Nao confundir essa evidencia com validacao de timer, novo evento automatico,
concorrencia ou rollout. Detalhes em VIDEO-CAPTIONS-ROLLOUT.md.

Reels: o player persistente mede o bloco de identidade em um escopo comum
para posicionar captions acima dele, com espaco lateral para controles no
mobile. O botao CC tem alvo explicito de 44px. Mascara do estado ativo usa
geometria inline de lucide, pois imagem PNG externa na mascara SVG nao
renderizava o simbolo no browser verificado; PNG do estado off preservado.
Validacao real em 390/1440px e 135 testes registrados no plano de rollout.
# Evidencia adicional de validacao local (2026-11-06)

Perfil sintetico temporario autorizado validou HTML inicial com transcricao
e controles CC em 390 e 1440 px, com API/banco/player reais. Dados de teste
removidos e runtime original restaurado. Erro de analytics de visualizacao
observado permanece pendente; nao declarar o fluxo inteiro pronto para producao.
Timer local de recuperacao passou em 64.4 s sem POST. Benchmark offline
indicou 14.5 s por exportacao isolada e 26.4 s por trabalho com dois paralelos;
isso nao substitui carga de fila nem medicao no servidor de producao.

## Correcao de apresentacao apos piloto em 2026-11-06

O iPhone mostrou captions do provedor e overlay Lectum simultaneamente.
Quando existem cues Lectum, o player desativa as outras faixas captions/subtitles,
inclusive faixas adicionadas ou selecionadas depois pelo HLS. Metadados nao mudam.
Inline e tela ampliada da Lectum usam somente o overlay. Apenas fullscreen nativo
do elemento video usa a faixa Lectum, com os mesmos cues; nunca os dois renderers.
Eventos WebKit preservam esse estado durante rerenders e limpam listeners ao sair.

CC passa ao canto superior direito, abaixo da acao social do dono ou do botao de
criar no viewer ampliado. Ambos os estados usam o PNG contornado aprovado; nome
acessivel e aria-pressed informam o estado. Refinamento aprovado em 2026-11-06:
o estado ativo preenche somente o interior de branco, com as letras escuras
recortadas da mesma mascara; o estado inativo permanece contornado.

Cards de listagem desabilitam a transcricao via TranscriptScope, mantendo CC e
playback independentes. O post aberto continua permitindo transcricao. Menus
sem acoes ficam ocultos para visitantes; editar legenda continua disponivel
para o autor. A politica vale para ambas as implementacoes de cards de feed.

O texto usa um unico inline-block com fundo e padding externos, em vez de
box-decoration-clone por linha. Isso elimina fundos invadindo linhas vizinhas,
mantem o bloco continuo e permite quebra de palavras longas. A medicao do overlay
inferior continua reservando espaco para contato e identidade.

Testes usam React, video real do repositorio e CSS compilado pelo Tailwind instalado.
Eventos WebKit sao exercitados em Chromium: nao equivalem a validacao em iPhone
fisico, que deve repetir o piloto apos publicacao. Nenhuma legenda foi regerada,
nenhuma faixa remota foi apagada e nenhuma configuracao produtiva foi alterada.

### Previa social e exportacao - 2026-11-06

Previa e MP4 usam os tempos completos dos cues revisados, sem repartir o tempo
proporcionalmente em blocos de 72 caracteres. A previa acompanha currentTime por
animation frame, com cleanup; ASS preserva a precisao de centesimos do formato.
O fundo da previa passa a inline-block. No libass, BorderStyle 4 e Shadow 8
produzem um unico fundo translucido por evento, sem sobrepor caixas por linha.
Referencia: https://github.com/libass/libass/wiki/Libass'-ASS-Extensions

A previa social limita sua altura a 55dvh e recorta video e overlays no mesmo
container arredondado; o arquivo exportado continua retangular. O editor remove
o modo compacto dependente de scroll: somente a lista rola no mobile, mantendo
o video centralizado no tamanho inicial. Desktop preserva o player sticky.
Estas mudancas exigem frontend e Video numa futura publicacao autorizada;
nao exigem nova geracao de transcricao nem alteracao da allowlist.

### Expansao global autorizada - 2026-11-06

VIDEO_CAPTIONS_ALL_ENABLED=true habilita leitura/edicao para qualquer asset valido;
VIDEO_CAPTIONS_AUTO_ENABLED=true continua sendo exigido para gerar automaticamente.
Ausencia da chave global preserva o piloto, inclusive rejeicao de wildcard.
O scheduler existente reconcilia a cada minuto. Globalmente seleciona videos
Cloudflare prontos, nao excluidos, de profissionais nao excluidos, com duracao
conhecida e finalidade de post/resposta/apresentacao. Midias privadas nao se
tornam publicas: as autorizacoes existentes permanecem em todos os endpoints.

Sincroniza ate 10 pendentes entre 1 minuto e 24 horas; inicia ate 2 sem registro
por ciclo, dos mais antigos aos novos, com backpressure em 10 pendentes recentes.
Limites sao por instancia; claim unico por asset permanece no banco, impedindo
POST duplicado. Falha do provedor interrompe o lote; registros ready/revisados,
error ou pendentes antigos nao sao regenerados automaticamente. Sao necessarios
acompanhamento operacional e revisao de falhas antes de qualquer retry manual.
Nao ha nova migracao. Rollback operacional: desligar automacao e/ou chave global,
preservando dados e a allowlist do piloto. Publicar Video, Backend e Frontend em
sequencia, validar saude e somente depois ativar a chave global no Backend.

### Revisao sem edicao e geometria de leitura - 2026-11-06

O editor oferece Marcar como revisada quando a legenda automatica ainda nao foi
revisada e nao ha edicoes pendentes. Reutiliza o PUT autorizado, com a revisao
atual e os mesmos cues; nao cria endpoint nem altera tempos. Se houver edicoes,
Salvar continua sendo a confirmacao. O estado revisado so aparece apos sucesso.

No diretorio, o bloco textual inferior e os cabecalhos mobile/desktop fornecem
limites geometricos para legendas e CC. A descricao expandida dos reels tambem
e um limite inferior, recalculado ao terminar a animacao. ResizeObserver acompanha
mudancas de tamanho. O CC ativo vaza as letras usando a mascara do mesmo asset,
sem pintar letras pretas. A previa social sem descricao usa altura ajustada ao
conteudo em vez de reservar espaco vazio. Nenhuma mudanca em geracao, filas ou
exportacao de video nesta etapa; somente frontend, com validacao local.


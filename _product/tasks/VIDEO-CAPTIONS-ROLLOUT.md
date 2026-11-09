# Piloto de legendas: roteiro de publicacao

Status: publicacao solicitada pelo usuario; coordenacao e revisao pendentes.
Sem migracao remota, novo commit, push ou deploy desta preparacao.

## Evidencias desta rodada

### Confirmacoes operacionais em 2026-11-06

- Captura do Prisma executado em /app no backend produtivo: 115 migracoes
  encontradas, "Database schema is up to date". Confirma o baseline da imagem
  instalada, nao a aplicacao da nova migracao de legendas.
- Usuario confirmou o destino privado R2, bucket backup. Backup manual do
  banco lectum-production concluido em 2026-11-06 15:10:50 UTC (12:10:50 BRT).
  Log confirma geracao e upload ao S3/R2 concluidos; historico Done, 4 s.
  Prefixo /lectum-production/pre-deploy-2026-11-06, retencao All e agendamento
  Inactive. Nao houve teste de restauracao; nao afirmar recuperacao testada.
- Backup e baseline de migracoes deixam de ser pendencias de confirmacao.
  As observacoes anteriores abaixo sao historicas.
- Proxima coordenacao proposta: desativar temporariamente Auto-assign Custom
  Production Domains em frontend e admin na Vercel, mantendo a versao atual.
  Preparar PR revisado; apos merge, publicar video e backend manualmente,
  validar saude e promover os deployments staged das telas. Configuracao
  confirmada por capturas de frontend e admin em 2026-11-06, com Disabled
  e toast de salvamento em ambos. Os deployments novos precisam de promocao
  manual; manter os dominios na versao atual ate validar video/backend.

### Validacao de release retomada em 2026-11-06

- Frontend: lint e TypeScript passaram. A cadeia de testes passou ate o
  teste de posicao do convite de avaliacao; expectativa atualizada para
  incluir ScopedTranscriptPanel sem permitir convite dentro do player.
  Reexecucao de testimonials: 74 aprovados, zero skips; release-batch: 22
  aprovados. Demais suites da cadeia anterior sem falhas. Build completo
  (95 paginas) e limpeza de source maps passaram; dev server restaurado.
- Backend: check completo com banco loopback isolado e JWT de teste:
  1201 aprovados, zero falhas, dois testes opt-in ignorados. Nao representa
  teste de migracao ou dependencias produtivas. Falhas da primeira rodada
  por conexao ilustrativa/NODE_ENV global resolvidas na configuracao do teste.
- Admin e video: checks aprovados. Builds backend e video aprovados.
- Rota publica de frontend /version e backend /health e /ready: HTTP 200.
- Acesso automatizado aos paineis falhou novamente. Backup e status das
  migracoes produtivas nao confirmados; nenhum push, PR, merge ou deploy.
- Modelos de ambiente documentam lista vazia e automacao desligada.
  Bootstrap do backend aplica TODAS as migracoes pendentes por padrao;
  inspecionar a lista no servidor antes de autorizar sua execucao.

### Escopo acumulado da branch (referencias locais em 2026-11-06)

Atualizacao apos git fetch origin em 2026-11-06: origin/main avancou para
caab94105. Somente e7a508a48 e 4f2e20d79 permanecem em origin/main..HEAD;
os lotes 75b702dac e 66cf3d5f7 abaixo ja foram integrados na main e nao sao
novidades desta promocao. Somar as alteracoes locais de legendas ao lote
de avaliacoes. Usuario confirmou que autodeploys de homolog continuam
desligados; capturas anteriores comprovam os controles de producao.
Pedido "vamos publicar?" autoriza prosseguir pelo fluxo revisado, sem
dispensar checks, backup/migracoes ou coordenacao dos quatro aplicativos.

Nao tratar a promocao inteira de homolog como lote exclusivo de legendas.
Comparacao com origin/main local inclui quatro commits anteriores:

- 75b702dac: assinaturas e reproducao de midia.
- 66cf3d5f7: downloads de notas fiscais, busca CRP e cards de compartilhamento.
- e7a508a48: convites/notificacoes de avaliacao e acoes responsivas (TASK-318).
- 4f2e20d79: modal de avaliacoes pendentes e acoes compactas (TASK-318).

Os dois ultimos ainda estao a frente de origin/homolog local. As legendas e
correcoes relacionadas permanecem no working tree. Atualizar referencias
remotas antes de fechar o manifesto/PR; esta lista nao comprova o codigo
efetivamente publicado. TASK-318 registra checks/build e QA local anteriores;
a validacao de release deve cobrir a interacao entre os lotes.

### Fila local em 2026-11-06

Tres pedidos reais na API loopback/Redis local, um por modo de sobreposicao,
concluiram sem sobreposicao temporal de processamento. Concorrencia observada
1; tempos de execucao 32.4, 27.6 e 24.9 s, esperas 0.01, 31.1 e 58.7 s.
Saidas com aproximadamente 4.8 MB. Somente os tres jobs deste teste foram
removidos ao terminar. Evidencia .tmp/caption-queue-readiness-result.json.
Nao mede CPU/pico de memoria nem capacidade do servidor Linux de producao.

- Builds locais: frontend next build --webpack concluido (95 paginas
  estaticas), backend tsc + tsc-alias e video tsc concluidos. Etapa de
  limpeza de source maps nao executada para preservar o dev server ativo;
  nenhum artefato foi publicado. Checks completos continuam pendentes.

- Oito testes de politica/parser/automacao passaram.
- Banco local: permissao de dono, concorrencia 200/409, revisao persistida,
  video privado, post excluido e geracao duplicada verificados.
- Perfil: leitura da transcricao bloqueada para perfil nao publicado ou
  proprietario inativo; nenhuma conta existente modificada no teste.
- HTML inicial do post local contem os sete trechos revisados; canonical
  e robots preservados. Nao representa garantia de indexacao.
- Exportacao: 44 testes unitarios passaram e 15 testes com FFmpeg real
  passaram apos configurar o caminho local. Tres modos e resolucoes cobertos.
- Perfil publico agora recebe as legendas do video de apresentacao pelo
  endpoint SEO existente. Texto em secao sr-only, acessivel a leitores de
  tela, sem novo painel visual. Teste integrado completo da pagina pendente.
- Reels reutilizam PlayerCaptions no ContentVideoPlayer. Nao foi adicionada
  uma transcricao visual ao viewer. O HTML indexavel de cada video de
  comunidade permanece na pagina publica canonica do post ou resposta.

## Antes de liberar

- [x] Credenciais locais para leitura autenticada da API Stream.
- [x] Validar status e VTT pela API no UID autorizado, sem regenerar legenda.
- [x] Validar POST real de geracao em copia autorizada sem legenda existente.
- [x] Validar adaptador de legendas e retomada do scheduler contra API real.
- [ ] Validar inicio automatico de geracao e ciclo do timer no ambiente de destino.
- [ ] Revisao humana de precisao, silencio, audio ruim e multiplas vozes.
- [ ] Medir consumo da fila, tempo, CPU e memoria com concorrencia realista.
- [ ] Confirmar build completo e checks de todos os aplicativos afetados.
- [x] Validar reels reais em navegador desktop e viewport mobile.
- [x] Validar perfil publico completo em navegador local (390 e 1440 px).
- [ ] Testar aparelho mobile fisico: usuario executara no piloto em producao.
- [x] Registrar declaracao do usuario de uso permitido do icone sem licenca
      adicional. Nao equivale a verificacao independente dos termos do PNG.
- [ ] Aprovar video e ativo de producao; nao reutilizar IDs locais ficticios.
- [ ] Revisar PR e desativacao dos gatilhos antigos de homologacao.
- [ ] Autorizar explicitamente migracao e deploy em producao.

## Sequencia proposta (nao executada)

### Gatilhos confirmados por capturas em 2026-11-06

- Backend Dokploy: main, build path backend, Autodeploy desligado.
- Video Dokploy: main, Compose ./video/docker-compose.yml, Autodeploy desligado.
- Frontend e admin Vercel: Production acompanha main; associacao automatica
  dos dominios habilitada. Tratar merge/push para main como publicacao.
- Frontend sem Deploy Hooks cadastrados; isso nao desabilita a integracao Git.
- Configuracao atual de previews/homologacao ainda nao comprovada. Nao fazer
  push para homolog ate verificar que nao iniciara builds remotos indesejados.

Antes do merge, definir uma promocao coordenada: impedir que a nova interface
seja promovida antes dos servicos, mediante configuracao aprovada na Vercel ou
entregas separadas e revisadas. Nao alterar esses controles automaticamente.
As capturas nao comprovam backup, migracoes aplicadas, Redis, fontes ou
capacidade do runtime. Estas verificacoes permanecem gates operacionais.

### Ordem de execucao

1. Conferir backup recuperavel, saude dos servicos e migracoes pendentes.
   Revisar toda a lista antes de migrate deploy; ele aplica todas as pendentes.
2. Manter VIDEO_CAPTIONS_AUTO_ENABLED=false e VIDEO_CAPTIONS_ASSET_IDS vazio.
3. Aplicar migracao aditiva 20261105230000_video_captions; nao usar db push,
   reset ou seed. A tabela e compativel com o codigo anterior.
4. Publicar API/worker de video com suporte aos tres modos antes do backend
   que os solicita; depois backend e frontend, respeitando checks do PR.
5. Verificar Redis, FFmpeg com subtitles/libass, Manrope e armazenamento
   temporario no runtime Linux. Nao levar URLs/chaves de teste locais.
6. Preencher VIDEO_CAPTIONS_ASSET_IDS com apenas o ID interno de um video
   autorizado (nao o UID Cloudflare). Manter automacao desligada.
7. Validar CC, edicao pelo dono, bloqueio para terceiros, HTML publico,
   correcao apos salvar e os tres downloads no piloto.
8. Somente apos teste real e aprovacao, habilitar automacao para esse ID.
   Observar falhas e recursos antes de ampliar a lista.

## Reversao

Desligar VIDEO_CAPTIONS_AUTO_ENABLED e esvaziar VIDEO_CAPTIONS_ASSET_IDS;
reiniciar o backend para aplicar o ambiente. Isso impede novos pedidos,
mas nao cancela jobs ja aceitos nem trabalho na Cloudflare. Acompanhar a
fila ate concluir; nao apagar dados, legenda remota ou tabela. Se necessario,
reverter os aplicativos mantendo a migracao aditiva e revisoes armazenadas.

## Custos e limites

Em 2026-11-06, duas chamadas GET autenticadas (status pt e VTT) ao UID
51bd3ebf151d97a9f5f5199118e1eded retornaram ready e 766 bytes. Parser real
do backend validou sete cues, ultimo fim 31.583 s, identicos ao arquivo
original importado. Nenhuma escrita local no banco nem alteracao remota.
Token somente leitura usado em memoria, sem impressao. Este smoke valida
acesso e parsing, nao a configuracao completa do adaptador em producao,
o scheduler ou POST de geracao. Correcoes locais do usuario preservadas.

Documentacao consultada: Stream cobra armazenamento e entrega; downloads e
preload tambem consomem entrega. Exportacao local consome CPU/disco/Redis.
Nao afirmar custo efetivo nem gratuidade da operacao sem medir o piloto e
verificar o contrato da conta. O video autorizado ja tem legenda pt; nao
excluir a existente para forcar um teste de geracao.

- https://developers.cloudflare.com/stream/pricing/
- https://developers.cloudflare.com/stream/edit-videos/adding-captions/
- https://developers.cloudflare.com/api/resources/stream/subresources/captions/subresources/language/methods/get/

Token de leitura local: arquivo ignorado .tmp/cloudflare-caption-check.env.
Nenhum segredo deve ser incluido no Git, logs, capturas ou nesta documentacao.

## Geracao real autorizada em 2026-11-06

Usuario adicionou Stream Edit ao token e autorizou uma unica copia remota
do video institucional, incluindo armazenamento e geracao de legenda pt.
Upload de frontend/public/videos/verification-v1.mp4 (10337784 bytes)
criou UID ca844d2ec497ae8712cfb6391f921f37. Apos readyToStream, um unico
POST /captions/pt/generate retornou inprogress; consulta posterior ready.
Parser real do backend aceitou sete cues, 766 bytes, ultimo fim 31.583 s.
VTT gerado identico byte a byte ao VTT do original consultado por GET.
Pedido registrado as 03:23:09 UTC; validacao as 03:23:34 UTC, sem inferir
latencia exata de processamento a partir do intervalo de consultas.

Evidencia local ignorada: .tmp/cloudflare-caption-generation-proof.json e
.tmp/cloudflare-generated-copy-pt.vtt. Marcador impede repeticao cega do
upload ou POST. Original 51bd3ebf151d97a9f5f5199118e1eded preservado;
nenhuma escrita no banco local, substituicao de revisoes ou deploy.
A copia permanece na conta Stream e pode consumir armazenamento.
Automacao continua desligada; este teste direto nao valida scheduler,
configuracao completa do adaptador, concorrencia ou precisao em outros audios.

## Retomada integrada em 2026-11-06

Configuracao da API separada das chaves de playback e webhook: captions
usam getVideoStreamApiConfig com conta, token, timeout e habilitacao Stream.
Upload e playback continuam exigindo getVideoStreamConfig completo. Sem
novas variaveis, sem relaxar assinatura, origens ou autorizacao por ativo.

Script local ignorado .tmp/caption-real-sync.cjs associou temporariamente a
copia real a um ativo isolado no banco loopback. Registro inprogress representa
o POST ja realizado. runAutomaticCaptions executou GET status e VTT reais;
sete cues foram persistidos, revisao 1. Edicao local avancou para revisao 2;
segunda execucao preservou os cues revisados e nao chamou o provider.
Legenda original do usuario comparada antes/depois, sem diferenca.
Fixture removida ao terminar; flag habilitada somente no processo de teste.
Fetch encaminhado ao provider real com bloqueio de qualquer metodo nao GET.

40 testes Stream/captions passaram, incluindo configuracao completa,
assinatura privada e webhook. Biome dos quatro arquivos alterados passou.
Este teste cobre recuperacao de estado, nao novo POST pelo scheduler nem
timer de 60 segundos, carga ou configuracao de playback do ambiente publicado.

## Reels integrados e regressao em 2026-11-06

Teste real com publicacao local, banco e HLS do Stream em Edge headless,
viewports 390x900 e 1440x900. Os reels filtram autores sem plano profissional
e verificacao; nao relaxar essa regra para o teste. Usuario autorizou grant
temporario somente local. Script .tmp/caption-reels-real.cjs criou assinatura
isolada de uma hora e restaurou crp_status/cfp_verified_at/updatedAt em finally,
removendo a assinatura temporaria. Nenhuma chamada ao gateway de pagamento.

Corrigida sobreposicao da legenda ao autor: player persistente mede o bloco
de identidade dentro do escopo visual do reel, mesmo fora do container do
video. Mobile reserva margem para a barra de acoes; desktop conserva largura.
Area CC explicitamente 44x44 px, independente da escala rem. Simbolo ativo
usa geometria inline ClosedCaption de lucide dentro da mascara existente,
evitando imagem externa que aparecia como quadrado branco no SVG mask.
Estado desligado continua com PNG existente, cuja licenca segue pendente.

Teste confirmou sincronizacao por seek, ativar/desativar, area de toque,
limites do viewport, separacao da identidade e preservacao do registro de
legenda. Capturas real-reels-390.png e real-reels-1440.png em .tmp/caption-previews.
Inspecao visual realizada nas duas. Nao representa teste em celular fisico.

Harness de audio atualizado para carregar o componente real de captions.
135 testes de reels/audio/fila/scroll/viewport passaram com Playwright,
zero skips. Biome dos cinco arquivos alterados passou. Perfil publico
completo ainda pendente: a conta local incompleta aciona onboarding de
WhatsApp; nenhum numero ou dado profissional foi inventado para contornar.

## Timer, benchmark e perfil temporario em 2026-11-06

Timer real local recuperou a copia autorizada em 64403 ms: GET de status e
VTT, sete cues persistidos, nenhuma nova geracao. Nao valida POST inicial
automatico nem ambiente publicado.

Benchmark offline do renderer real, fonte de 32.9 s: um MP4 em 14.5 s;
dois simultaneos em 26.4 s cada. Saidas 1080x1920 H264/AAC validadas.
Memoria amostrada de FFmpeg: cerca de 495 MiB com um e 998 MiB com dois.
Amostragem esparsa: nao representa pico exato, carga da fila ou capacidade
de producao. Manter concorrencia conservadora; teste de fila continua pendente.

Usuario autorizou perfil separado, sintetico e temporario no banco loopback.
Teste .tmp/caption-profile-real.cjs usou copia Stream ja existente, sem
upload ou geracao. Pagina publica real passou em 390x900 e 1440x900:
transcricao no HTML inicial, cues persistidos, seek, CC e alvo de 44 px.
Capturas real-profile-390.png e real-profile-1440.png inspecionadas.
Nenhuma escrita no perfil ou legenda do usuario. Perfil temporario removido
por ID/email exatos e cascata: zero usuarios e ativos restantes. Backend
local original restaurado. Conexao persistente exigiu limpeza assistida.

Observado UnknownError em directory_psychologists_video_watch durante o
teste: rastreamento de visualizacao requer investigacao antes de afirmar
validacao completa do perfil. Celular fisico, carga real, licenca do PNG e
demais gates de publicacao continuam pendentes. Sem push ou deploy.

## Correcao do registro de visualizacoes em 2026-11-06

[x] Causa reproduzida no navegador: P2002 em profile_video_watch_sessions,
duas criacoes concorrentes para psychologist_id/session_key. Nao era falha
do Stream, da legenda ou requisito ausente no perfil sintetico.

[x] Read/merge/write executados em transacao ReadCommitted com advisory lock
por sessao. Preserva maximos, marcos e retencao em eventos fora de ordem.
Sem alteracao de schema, API, permissao publica ou resposta de erro.

[x] Teste integrado persistente ProfileVideoWatchRepository.integration.test.ts
passou no PostgreSQL local: oito criacoes simultaneas, uma linha, atualizacoes
fora de ordem preservando maximos e marcos. Exige opt-in e endereco loopback.

[x] Repeticao no navegador em 390x900 e 1440x900: respostas video-watch 200,
legendas/CC/HTML preservados. Perfil temporario removido, conta e legenda do
usuario comparadas sem diferenca, backend local original restaurado.
O erro de analytics acima foi resolvido localmente; demais gates permanecem.

## Ajustes visuais do piloto - 2026-11-06

- [x] Suprimir captions duplicadas do provedor, incluindo faixas HLS tardias.
- [x] Preservar somente o overlay Lectum na visualizacao ampliada do site.
- [x] CC no topo direito, abaixo do Instagram para o dono; respeitar o botao + no viewer.
- [x] Usar o icone contornado aprovado tanto ligado quanto desligado.
- [x] Fundo unico continuo, sem sobreposicao entre linhas ou letras cobertas.
- [x] Suite de video/contato: 98 testes passaram, sem skips, incluindo dois testes
  de captions em 390/1440 px, troca de faixas, toggle, fullscreen, overlays e cleanup.
- [x] Player Next real inspecionado localmente em 390/1440 px: oito combinacoes de
  dono/visitante e contato/perfil, com capturas em .tmp/caption-previews/actual-fix-*.
  Pagina temporaria removida antes do build; nenhum dado persistente criado.
- [x] `pnpm --dir frontend check` com Playwright habilitado e
  `pnpm --dir frontend build` passaram na versao local 0.1.784.
- [ ] Repetir o teste no iPhone fisico depois da publicacao autorizada.

Referencia visual: capturas do usuario nesta conversa. Builder nao utilizado nesta
correcao pontual. Mudancas restritas ao frontend; geracao, revisao e allowlist nao mudam.

## Refinamento do piloto - 2026-11-06

- [x] CC ativo com interior branco e letras escuras usando a mesma mascara original.
- [x] CC desativado preserva o contorno de referencia.
- [x] Cards de listagem nao oferecem transcricao nem menu vazio para visitantes.
- [x] Post aberto preserva transcricao; proprietario preserva edicao de legendas no feed.
- [x] Legendas e controle CC independem da disponibilidade da transcricao.
- [x] 14 testes focados passaram, incluindo browser em 390/1440 px; captura do CC inspecionada.
- [x] Validacao global `pnpm check` e build do frontend passaram em 0.1.785.
- [ ] Publicar e repetir a validacao no iPhone fisico; nenhuma publicacao nesta etapa.

## Previa social e editor fixo - 2026-11-06

- [x] Previa social com cantos arredondados, recorte das sobreposicoes e altura limitada a 55dvh.
- [x] Editor mantem video centralizado no tamanho inicial enquanto a lista de frases rola.
- [x] Previa e ASS preservam os cues inteiros e seus tempos, sem subdivisao artificial por caracteres.
- [x] Fundo unico por cue na previa e no MP4, sem caixas sobrepostas por linha.
- [x] Checks globais e builds de frontend/Video passaram em 0.1.786.
- [x] 16 testes focados e 3 renders FFmpeg passaram, incluindo pixels do fundo multiline.
- [x] Modal real conferida em 320/390/844/1440 px; editor fixo em 320/390/1440 px.
- [ ] Publicacao autorizada de frontend e Video; testar novamente no iPhone fisico.

## Liberacao global autorizada - 2026-11-06

- Usuario autorizou liberar legendas para todos os videos e publicar as atualizacoes.
- Usuario reconfirmou Autodeploy Backend/Video desligado e promocao manual Vercel frontend/admin.
- [x] Chave VIDEO_CAPTIONS_ALL_ENABLED independente, false por padrao, preserva allowlist antiga.
- [x] Reconciliacao global de videos prontos de profissionais, ate 2 novos por ciclo e pausa com 10 pendentes recentes.
- [x] Preservar registros revisados/ready/error; nao repetir POST incerto; manter autorizacao de leitura/edicao.
- [x] Checks completos do workspace e builds Backend/Video/Frontend em 0.1.787.
- [x] Integracao PostgreSQL local real: elegibilidade, limite de lote, backpressure, sync e preservacao de revisada.
- [x] Modelo production documenta as duas chaves desligadas por padrao; teste de cobertura passou.
- [ ] PR revisado e merge sem push direto em main.
- [ ] Publicar Video, depois Backend e Frontend; nao promover admin.
- [ ] Ativar VIDEO_CAPTIONS_ALL_ENABLED=true com VIDEO_CAPTIONS_AUTO_ENABLED=true apos smoke.
- [ ] Confirmar geracao e revisao em producao; iPhone fisico pendente.

ALERTA DE DEPLOY: nova chave opcional VIDEO_CAPTIONS_ALL_ENABLED no Backend.
Ausente/false preserva o piloto; true inclui videos antigos e novos prontos,
inclusive midias ainda privadas (sem modificar sua visibilidade). Pode aumentar
uso/custo do provedor. Nao basta usar '*' em VIDEO_CAPTIONS_ASSET_IDS.
Sem migracao nova. Manter a lista do piloto para rollback da chave global.
Lote limitado por instancia; a unicidade de video_caption impede geracao duplicada
por asset. A geracao usa o provedor; o render de downloads continua no Video.

## Refinamentos de leitura e revisao - 2026-11-06

- [x] Editor substitui Portugues por Gerada automaticamente e permite Marcar como revisada sem alterar frases.
- [x] Revisao reutiliza salvamento autorizado com controle de revisao; alteracoes pendentes exigem Salvar.
- [x] CC ativo preserva referencia, preenchimento branco e letras vazadas transparentes.
- [x] Diretorio mede bloco de identificacao e cabecalho para separar legendas, busca e CC.
- [x] Descricao expandida dos reels participa do calculo de posicao das legendas.
- [x] Previa sem descricao remove espaco excedente, preservando video arredondado e controles.
- [x] Integracao local real confirmou revisao persistida sem alterar cues e restaurou dados de teste.
- [x] Layout do editor em 320/390/1440 px e previa em 320/390/844/1440 px conferidos.
- [x] Reels reais locais em 390/1440 px sem sobreposicao com descricao expandida.
- [x] Diretorio local real em 390/1440 px: legenda acima da bio, CC abaixo da busca com filtros, espaco lateral reservado aos controles.
- [x] Checks globais e build final do frontend passaram em 0.1.788; teste de pixels confirma letras vazadas no CC.
- [ ] Validar esta versao no Safari/iPhone fisico antes de publicar.

Referencia visual: capturas fornecidas pelo usuario. Builder indisponivel nesta sessao.
Este lote permanece local; nao autoriza novo push, merge ou deploy.

## Controles imersivos e estabilidade inicial - 2026-11-06

- [x] CC no slot imediatamente anterior ao volume, sem segundo botao no topo do player imersivo.
- [x] Transicao preserva a escolha da legenda; controles ocultos nao recebem foco.
- [x] Previa sem descricao usa altura definida desde a montagem, sem flex-shrink com altura percentual circular.
- [x] Navegador local: previa real estavel durante seis segundos em 320/390/844/1440 px; dados isolados restaurados.
- [x] Testes de CC no navegador em 390/1440 px: posicao, alternancia, transicao e preferencia.
- [x] Frontend check completo e verificacao de versoes locais passaram em 0.1.789.
- [ ] Confirmar comportamento no Safari/iPhone fisico.
- [x] Concluir validacao do restante do lote de perfil e Minhas publicacoes.

Sem publicacao neste ajuste. Referencia: gravacao do usuario de 23:25.

## Publicacoes proprias e apresentacao do perfil - 2026-11-07

- [x] Minhas publicacoes abre videos no viewer existente sem controles inline.
- [x] Sequencia usa escopo profile, apenas autoria propria, reunindo posts e respostas com paginacao independente da aba.
- [x] Apresentacao abre por clique no modo imersivo, com fechar a esquerda, progresso e CC antes do volume.
- [x] Navegador local real em 390/1440 px: resposta/resposta/post, retorno a aba, seek preservado, fechar/Escape e legendas acima dos controles.
- [x] Dados temporarios de perfil, assinatura, relacoes e respostas restaurados ao final dos testes locais.
- [x] Beneficio do plano Profissional substitui identificacao por legenda automatica.
- [x] Imagem real da Marcella aprovada pelo usuario, capturada na previa local com pergunta e cues publicos; sem geracao artificial.
- [x] Detalhe do beneficio conferido em 390/1440 px com imagem inteira, sem corte ou overflow horizontal.
- [x] Doze regressoes focadas de geometria, captions e controles passaram com navegador, sem skips.
- [x] Check global completo, build do frontend e sincronizacao dos cinco manifests em 0.1.790 passaram.
- [ ] Safari/iPhone fisico e publicacao deste lote permanecem pendentes.

Referencia visual: imagens e gravacao do usuario; Builder indisponivel.
Nao houve push, merge nem deploy neste lote.

## Pending video startup improvements (2026-11-08)

Update: user authorized implementation and a production test after supplying the
iPhone baseline. ADR-0682 defines the bounded scope; directory shared-player
migration remains deferred so its measured preparation is preserved.

### Startup production experiment

- [x] Incoming poster overlay until decoded current-frame availability.
- [x] Directory current/next auto preload, existing source activation preserved.
- [x] Content standby promoted without source reload; one active plus one reserve.
- [x] Standby has no analytics owner, playback callbacks or autoplay.
- [x] Focused browser regressions, actual-media local smoke and frontend check/build.
- [ ] Reviewed homolog-to-main PR and frontend-only production promotion.
- [ ] Physical iPhone comparison on the same sequence and connection.

Local validation: 26 player browser cases passed, including real MP4 decoding and
standby promotion at 390px and 1440px. Frontend check and production build passed.
The full application flow still requires its local backend; these browser cases
exercise the actual media elements in an isolated component harness, not Safari.
Existing loopback database configuration was found in another local checkout and
used only in the validation process environment; no credentials were copied into
the repository or printed. No production database was used.
The initial backend check had three filesRoute.test.ts failures because the
account_media_deletion lookup required an unavailable database. With the user's
approval, a new portable PostgreSQL instance was bound to loopback, a new test
database received all existing migrations, and all four route cases passed.
Full pnpm check then passed under Node 24.22.1 with this isolated database.
No backend route/test behavior was changed to bypass the database requirement.
Additional player regressions confirm that failed preparation retries once at
activation while healthy buffers are preserved. No retry loop on active renders.
Admin and Video checks passed under Node 24.22.1; optional integration cases
retain their existing skip conditions. The final recovery build and source-size
guard passed. This batch is validated locally for the authorized frontend-only
production experiment; PR, promotion and physical iPhone comparison remain gates.

User approved keeping the following work queued, not implementing it yet:

- [ ] Reuse one shared playback element in the psychologists directory, preserving
  captions, sound preference, immersive controls, playback position and analytics.
- [ ] Investigate startup gaps shown in WhatsApp Video 2026-11-08 at 20.44.26.mp4.
  Sampled frames show black video areas between visible images during reel changes.
- [ ] Keep the incoming video's poster visible until its first rendered frame.
  Do not present the previous video's image or captions as the new video's content.
- [ ] Evaluate bounded preparation of the next source/poster and cautious media
  preloading without competing with the active video on slow connections.
- [ ] Measure startup and source reattachment before changing reset behavior;
  the current reset protects against attributing old media events to a new reel.
- [ ] Validate slow-network behavior and real iPhone/Safari before publication.

Code inspection: directory and content use the same HLS attachment hook. Content
reels already share a player, so that change alone will not fix their startup gap.
Their poster is supplied by playback metadata, without an independent fallback in
PersistentMedia. Actual network/decode timings have not yet been measured.

### Startup investigation findings (2026-11-08)

- Recording: seven black intervals in the central region, about 0.70-1.32s.
  These are visual gaps, not network latency; adjacent gaps may be one transition.
- Reels reuse an element but reset/attach sources on ownership changes. Queue
  pagination prepares item data, not the next video's media.
- Directory owns separate players with a 300px activation margin. Both surfaces
  use the same HLS hook, preferring native HLS where available.
- Isolated Edge observation: two load calls on reels entry; twenty video elements
  in the directory, two starting loads. This does not prove concurrent decoding.
- Automated scrolling did not confirm reel transitions, so this run cannot
  establish transition timings or explain iPhone behavior conclusively.
  Production version parity was not reverified during this run.
- Plan for both surfaces: incoming poster until first rendered frame; bounded
  next metadata/poster preparation; evaluate media prefetch without starving the
  active video; profile redundant attachments while preserving event ownership.
  Poster retention hides black gaps but does not itself accelerate loading.
- Validate cold/warm startup and stalls on constrained bandwidth, then physical
  iPhone native HLS. hls.js settings do not govern Safari native HLS.

Analysis only: no player implementation, version bump, push or deployment.

### Opt-in measurement implementation (2026-11-08)

User approved measuring current players before changing their architecture.

- [x] Passive observer for selection, media readiness, waits and first observed frame.
- [x] Shared diagnostics for directory and content, without changing playback.
- [x] Manual JSON export/share, no remote upload or persistent storage; 4000-event cap.
- [x] Unit tests for timestamps, bounded memory, snapshots and passive implementation.
- [x] Isolated browser test with the user's real recording: both surfaces, first
  frame, selection change and no further events after stopping.
- [x] Frontend check, production build and opt-in/export UI validation at
  390x844 and 1440x900 passed (0.1.792). Default access has no diagnostic toolbar.
- [ ] Global check stopped at backend Prisma generation: local DATABASE_URL
  absent. No substitute database or production credentials were used. Frontend
  checks completed first; remaining global stages are not claimed as passing.
- [ ] Physical iPhone comparison before any player optimization.

Test procedure: open a local/test URL with `?videoDiagnostics=1` on initial load.
Record the screen, visit Psychologists and content reels, wait three seconds on
each video, then stop and export with the two diagnostic icon buttons. Export
before reloading: records are memory-only. Repeat separately on Wi-Fi/cellular
and repeat the same sequence for warm-cache comparison. Note connection and test
order separately; the report deliberately contains no device/user/video identity.

Resource timings may be absent for native HLS on Safari. Selection is observed
after React updates the DOM, not the instant a finger touches the screen. Media
`stalled` is not automatically a visible stall; distinguish seeking, background
tabs and pauses using accompanying events. No claim of precise network/decode
attribution without those additional observations. No production publication.

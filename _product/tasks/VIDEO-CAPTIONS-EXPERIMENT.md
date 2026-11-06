# Legendas Cloudflare Stream - implementacao local

Status: em andamento. Branch homolog. Sem commit, push ou deploy por pedido
expresso do usuario. Preservar lote de avaliacoes anterior e regras SEO.

## Aceite

Rodada de preparacao para piloto: ver VIDEO-CAPTIONS-ROLLOUT.md. Backend e
video compilaram localmente; TypeScript frontend passou. Testes de banco
foram repetidos incluindo privacidade de perfil publicado/inativo. Oito
testes de legendas, 44 de exportacao/politicas e 15 renders FFmpeg passaram.
HTML publico novamente confirmou sete cues revisados, canonical e robots.
Endpoint SEO e pagina publica de psicologo agora incluem transcricao
acessivel sem painel visual. Integracao de navegador desse perfil pendente.
Credenciais Stream ausentes no ambiente local: usuario esta configurando
token temporario somente leitura com orientacao; nenhum segredo no chat.
Usuario informa que o icone enviado permite uso sem credito; isso nao
substitui verificacao independente dos termos associados ao arquivo.

- [x] Migracao aditiva aplicada somente no banco local isolado autorizado.
- [x] Allowlist por video, desativada por padrao.
- [x] Adaptador pt com estados inprogress, ready, error e leitura WebVTT.
- [x] Testes unitarios de parsing, limites, tempos e allowlist.
- [x] Persistencia com revisao otimista e marcacao automatica ao salvar.
- [x] Testar autorizacao e concorrencia contra o banco isolado.
- [ ] Validar player CC, busca temporal, velocidades, WhatsApp e reels em browser.
- [x] Validar editor em tela inteira com dados persistidos.
- [x] Completar menu Ver transcricao e posicionamento no post existente.
- [x] Validar HTML inicial, privacidade, canonical e regras de indexacao no post local.
- [x] Incorporar legendas no exportador MP4, mantendo Identificacao e Nenhum.
- [x] Preparar automacao opt-in apos ready, desligada e com allowlist limitada.
- [ ] Demonstrar equivalencia e desempenho da exportacao anterior.
- [x] Autorizar video especifico e executar geracao real Cloudflare.
- [ ] Medir precisao PT-BR, audio ruim, silencio, multiplas vozes e custos.
- [ ] Resolver licenca do icone antes de publicar.

## Evidencias locais

### API real somente leitura - 2026-11-06

Token local configurado pelo usuario. GET status pt e GET VTT no unico UID
autorizado passaram: ready, 766 bytes, sete cues, fim em 31.583 segundos.
Parser real confirmou igualdade com os cues originalmente importados.
Sem POST, geracao, upload, exclusao ou sobrescrita de revisoes locais.
Leitura autenticada comprovada; automacao e adaptador completo ainda pendentes.

### Fidelidade do editor e tipografia

Editor alinhado as capturas aprovadas 08-editor-mobile e 09-editor-desktop:
video 146 px mobile / 270 px desktop, controles azuis externos, campos
compactos e destaque do trecho ativo. Reutilizados player e formulario reais.
Edge confirmou Manrope herdada do body no titulo, Salvar, textarea, labels,
idioma e texto auxiliar. Teste com banco isolado passou para salvar/recarregar,
revisao automatica, play/pause, seek e ausencia de overflow em 320/390/1440 px.
Capturas atualizadas editor-real-*.png. Rotas temporarias removidas; nenhuma
alteracao no texto salvo pelo usuario nem no layout dos demais players.

### Teste manual na conta local

Video institucional autorizado vinculado a conta local informada pelo usuario,
post caption-local-verification-post e ativo caption-local-verification-v1.
Sete cues importados do pt.vtt real; revisoes existentes nao sao sobrescritas.
Reproducao publica do UID autorizado habilitada exclusivamente com NODE_ENV
development, BASE loopback e allowlist explicita. Nenhuma credencial do Stream
ou nova geracao utilizada. O backend local roda o codigo-fonte atualizado.
Editor: /app/videos/caption-local-verification-v1/legendas. A autenticacao e a
verificacao de propriedade permanecem obrigatorias. Teste manual do usuario
ainda pendente; exportacao MP4 ainda nao concluida.

### Editor com WebVTT real

Teste integrado do CaptionEditForm com rotas reais de legenda e banco local
passou: sete trechos reais, correcao, incremento de revisao, revisada ao
salvar e persistencia apos recarregar. Sem overflow em 320/390/1440 px.
A porta temporaria era bloqueada pela CSP; o teste passou a usar proxy de
mesma origem, sem afrouxar a politica de seguranca do produto. Fixtures e
rotas temporarias removidas ao final. Capturas editor-real-*.png em .tmp.
Teste de servico publico confirmou texto corrigido e ocultacao apos exclusao
do post; isto ainda nao valida HTML inicial nem canonical.

### WebVTT real recebido em 2026-11-05

O usuario autorizou uma copia exclusiva de verification-v1.mp4 e realizou
upload e geracao pt pelo painel Cloudflare. UID de teste:
51bd3ebf151d97a9f5f5199118e1eded. Capturas mostram inprogress e depois ready.
O arquivo C:/Users/tulio/Downloads/pt.vtt foi validado pelo parser real:
766 bytes, 7 cues, sem sobreposicao, ultimo fim em 31.583 s. O MP4 local tem
32.899333 s. Ha espacos duplicados em alguns trechos; original preservado.

Teste Edge do VerticalVideoPlayer real passou para todos os cues em
320/390/1440 px: texto correspondente ao tempo, sem overflow horizontal,
acima da faixa WhatsApp, alternancia CC, seek com velocidade 2x e silencio
entre cues. Capturas .tmp/caption-previews/cloudflare-real-*.png.
Fixture temporaria usou o texto real e foi removida da arvore de rotas ao
final. Nao houve nova geracao, upload ou alteracao remota pelo agente.

Ainda nao foi comparado o audio palavra por palavra. Nao se inferem precisao
PT-BR geral, diarizacao, custo ou funcionamento do editor/SEO/exportador a
partir deste teste. A leitura autenticada pela API Cloudflare permanece sem
teste real; este VTT foi entregue manualmente pelo usuario.

Em 2026-11-05, cinco testes unitarios passaram sem chamadas a Cloudflare.
TypeScript backend e frontend passaram antes da ultima formatacao.
Teste integrado no banco local passou: propriedade, video privado, duracao,
revisao concorrente (um save 200 e outro 409), revisado ao salvar e bloqueio
de geracao duplicada. Registros temporarios removidos no finally.
O componente real VerticalVideoPlayer foi exercitado em navegador Edge com
verification-v1.mp4 local e trechos controlados: CC, seek, velocidade 2x,
fim de trecho e afastamento da faixa WhatsApp em 320/390/1440 px passaram.
Foi corrigida duplicacao de cues ao alternar uma faixa disabled. Capturas em
.tmp/caption-previews/actual-player-*.png. A rota temporaria de teste foi removida.
Isto nao valida precisao Cloudflare, editor integrado ou o viewer de reels.
Migracao 20261105230000_video_captions aplicada a PostgreSQL local na porta
55432, banco lectum_courtesy_review_20261104. Nenhum banco remoto alterado.

Editor mobile: video compacto e controles permanecem no topo; apenas a
lista de trechos rola. Teste Edge em 390x844, 320x568, 390x450 e 1440x900
confirmou reproducao durante rolagem, pausa e seek ao focar um campo e
ausencia de overflow horizontal. Em mobile, confirmou video visivel e
posicao fixa. Viewport curto simulado, sem teste de teclado em aparelho real.
Evidencia: .tmp/caption-previews/editor-fixed-*.png. Rota temporaria removida.

Refinamento mobile: apos rolar os trechos, video vira miniatura de 54px
com controles ao lado; retorna ao tamanho inicial no topo da lista.
Botao Salvar ao final compartilha o mesmo formulario e bloqueio de envio.
Teste isolado em 320, 390, 600 e 1440px confirmou reproducao continua,
miniatura mobile, restauracao, save/revisada e ausencia de overflow.
Save simulado neste teste, sem alterar legendas persistidas do usuario.
Capturas: .tmp/caption-previews/editor-compact-*.png.

Acompanhamento do trecho ativo: rolagem minima ao mudar cue, com margem
para cabecalho fixo desktop e somente na lista mobile. Foco nao e transferido.
Teste real do componente em 320/390/900/1440 px confirmou campos visiveis
ao avancar/voltar, reproducao preservada e pausa/foco durante edicao.
Fixture removida; nenhum texto persistido alterado. Evidencia em
.tmp/caption-previews/editor-follow-*.png.

Menu da pagina de publicacao conectado: Editar legenda para dono psicologo
e Ver transcricao para dono/visitante quando playback autorizado tem cues.
Painel abre abaixo da midia, fecha pelo X, recebe foco e identifica revisao.
Reutiliza query de playback, sem nova API ou alteracao do HTML SEO existente.
Teste dos componentes PostHeader/PostBody reais com dados/cache isolados
em 390/1440 px passou: link do editor, visitante sem edicao, abrir/fechar e
ausencia das opcoes sem legenda. Fixture temporaria removida. Nao valida
exportacao MP4 nem integra todos os menus de feed/respostas nesta etapa.

Ver ADR-0680 para limites e rollout. Nao considerar este lote pronto para
producao nem usar capturas antigas de prototipo como prova da implementacao.

## Validacao integrada adicional - fila e downloads locais

Usuario autorizou Redis isolado e uso exclusivo da sessao da conta local.
Sessao usada somente em memoria; senha e producao intocadas. Redis portable
escuta 127.0.0.1:56379, sem servico Windows ou persistencia. API/worker em
127.0.0.1:5134, concorrencia 1, maximo 5 jobs e arquivos com TTL de 1 hora.

Menus de post, feed e respostas ligados ao mesmo painel contextual. Teste
autenticado real do post confirmou Editar legenda, abrir/fechar transcricao
e correspondencia com os textos atuais do banco, sem sobrescrever revisoes.
Capturas em .tmp/caption-previews/final-*.png, mobile 390 e desktop 1440.

Download pelo botao real gerou tres MP4 distintos. Corrigida leitura de req.b
(o validador limpa req.body), que inicialmente descartava o modo escolhido.
Revisao de legenda participa do cache e e conferida no backend; textos para
render vem do banco, nao do cliente. Worker confirma suporte ao modo. A fila
social aceita payload limitado a 4 MiB, sem aumentar a fila de compressao.
Fontes locais Manrope configuradas via VIDEO_SOCIAL_BOLD_FONT_PATH e
VIDEO_SOCIAL_REGULAR_FONT_PATH; fallback Linux existente preservado.

Resultados da rodada integrada (uma amostra; nao constituem benchmark):
- Legenda: 37,9 s, 4.907.222 bytes.
- Identificacao: 36,9 s, 4.865.041 bytes.
- Nenhum: 51,7 s, 4.811.827 bytes.
Todos: H.264 1080x1920, AAC, 32,902687 s. Frames aos 8 s inspecionados:
legenda no lugar da identificacao, identificacao apenas no segundo, nenhum
dos dois no terceiro. Personalizacao superior permanece nas tres opcoes.

HTML publico retornou os 7 cues atuais, canonical preservado, index/follow
conforme elegibilidade existente e sem email no texto. Secao tambem visivel
ao visitante apos hidratacao. O Next envia HTML em streaming: JavaScript
desativado nao mostrou a secao; nao afirmar suporte visual sem JavaScript
nem garantia de indexacao pelo Google. Texto existe na resposta do servidor.

TypeScript backend/frontend/video passou. Testes: 8 de politica/parser/local
preview/automacao, 32 de filtros e URL segura, 1 de payload da fila passaram.
Testes anteriores de FFmpeg real e concorrencia continuam documentados acima.
Build completo e benchmark CPU/memoria sob carga ainda nao realizados nesta
rodada. Nao houve commit, push, deploy ou nova chamada de geracao Cloudflare.

Automacao preparada no bootstrap, mas VIDEO_CAPTIONS_AUTO_ENABLED nao foi
habilitada. Exige flag true, credenciais Stream e 1 a 10 IDs explicitos;
reconcilia somente videos ready de psicologos ativos a cada 60 s. Lock unico
persistido impede POST duplicado, inclusive entre processos. Consulta estado
pendente por ate 24 h; apos isso requer investigacao/sync manual. Estados
ready/error nunca sao regenerados automaticamente. API real e automacao
externa continuam aguardando validacao autorizada; nao foram simuladas como
evidencia de funcionamento na Cloudflare.

## Correcao de escopo: descricao abaixo do video

- Restaurado o tamanho anterior das legendas sincronizadas: 44 no MP4 e 4.1cqw na previa. A reducao anterior nao era o ajuste solicitado.
- Descricao abaixo do video com espacamento original leading-6 e divisor sutil antes de Sobreposicao no video.
- Validacao local: 31 testes de exportacao passaram; modal sem rolagem em cinco tamanhos de tela. Worker local reiniciado. Sem alteracao em producao.

## Ajustes visuais solicitados apos teste do usuario

Modal ampliada ate 560px e limitada pela altura disponivel, sem rolagem
interna. Video usa o espaco restante em 9:16; na horizontal curta, fica ao
lado dos controles. Descricao longa limitada visualmente a tres linhas,
com texto integral preservado no botao de copiar e titulo. Fonte da legenda
social reduzida de 44 para 36 no ASS e de 4.1 para 3.33cqw na previa.
Arte de Identificacao preservada em relacao ao codigo original do repositorio;
nenhuma alteracao nesta rodada em nome, categoria, selo ou posicionamento.
Nao houve consulta nem mudanca na producao.

Menu Editar legenda usa peso normal. Titulo do editor no singular. CC maior
no feed (32px de canvas, sem sombra); nos players sem botao Instagram,
canvas de 26px deixa desenho ativo com cerca de 22px, alinhado visualmente
aos demais controles dos reels. Area de toque permanece 44px.

Edge autenticado local: 320x568, 390x844, 900x850, 1440x900 e 844x390
confirmaram modal sem overflow, proporcao do video, selecao funcional,
peso 400 no menu e titulo singular. Capturas layout-*.png. TypeScript
frontend e 31 testes de filtros/exportacao passaram. Worker local reiniciado
para aplicar a fonte menor aos proximos arquivos. Nenhuma legenda salva
ou geracao Cloudflare alterada durante estes testes.

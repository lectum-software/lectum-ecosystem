# TASK-296 - Revisao visual de depoimentos

Status: validada localmente; promocao por PR e deploy ainda pendentes.
Publicacao do lote TASK-294/295/296 autorizada pelo usuario em 30/10/2026,
condicionada a validacao e PR revisado.

## Contexto

Revisao individual da galeria local pelo usuario. Telas sem observacao foram
aprovadas. Capturas da conversa sao a referencia complementar. PROTO-INVENTORY
e ARCHITECTURE consultados; Builder indisponivel. Mobile-first 320/390px,
progredindo para desktop 1440px. Nao redesenhar telas ja aprovadas.

## Aceite

- [x] Depoimento em bloco branco individual no perfil e nas listas privadas.
- [x] Identificacao segue comentarios do feed, preservando privacidade/autoria.
- [x] Resposta profissional conectada ao avatar pai pela arvore de comentarios.
- [x] CTA do perfil azul e compacto; CTA da modal transparente e cinza Lectum.
- [x] Remover descricao contextual do perfil, modal e lista do profissional.
- [x] Remover subtitulo de quantidade da lista profissional, mantendo os filtros.
- [x] Composer com publicacao junto a base/area segura e acessivel com teclado.
- [x] Remover linha entre identidade profissional e pergunta do formulario.
- [x] Convite so nas acoes da resposta profissional elegivel, nunca nas do post.
- [x] Capturar icone reviews na pagina de psicologos, mobile e desktop.
- [x] Preservar estrelas, editar/excluir, responder e ocultar/reexibir.
- [x] Checks, build e QA autenticada local aprovados no escopo alterado.
- [ ] Commit local versionado e promocao por PR sem push direto em main.
- [ ] Smoke produtivo e versoes publicados conferidos, ou bloqueio registrado.

## Rollout e seguranca

Usuario reconfirmou nesta publicacao: frontend/Admin Vercel com Don't build
anything e Backend/Video Dokploy com autodeploy desligado em homolog/producao.
Nao modificar essas configuracoes, Admin, Video ou Cloudflare. Nenhum novo
pacote ou variavel planejado. Lote pendente inclui migration expansiva de
visibilidade de respostas da TASK-295; backend antes do frontend. Preservar
coluna/dados em rollback e comunicar que backend antigo nao aplica ocultacao.

Snapshots/SSR da galeria nao substituem QA autenticada com API e banco locais
isolados. Manter manifests de fixtures novos; nao reutilizar IDs ja limpos como
se fossem ativos. Nunca enviar comentarios/depoimentos de teste em producao.

## Validacao

Versao local 0.1.756. Checks completos de frontend e backend aprovados;
backend 1.136 testes sem skips e build aprovado. Frontend check: 1.127 passes,
13 skips de ambiente; cobertura adicional em Chrome real: depoimentos 57/57,
videos e navegacao 114/114 e profile-header 20/20, sem skips.
Raiz: nove guards aprovados. Admin: 258 passes e um skip por permissao de
symlink. Video: 103 passes e seis skips por ffprobe ausente; sem deploy desses apps.

Revisao estatica final sem P1/P2 novo. Corrigido guard de dialog nativo no
feed para nao navegar ao clicar no conteudo da modal. Convite contextual
existe apenas na barra real de ReplyCard e na contribuicao primaryReply;
preview destacado nao recebe controle avulso nem o transfere ao post original.

Privacidade: DTO publico de depoimento fornece nome abreviado e iniciais, nao
foto privada. Foto do paciente autenticado aparece somente em sua propria
lista. Nao ampliar exposicao de identidade para obter paridade visual.

Risco residual confirmado: video-watch retornou HTTP 500 no QA atual por corrida
preexistente entre findFirst/create. PostgreSQL registrou violacao da chave unica
da sessao de visualizacao; a sessao concorrente foi criada 50 ms antes. Schema e
indices locais corretos, runtime igual ao fonte, fluxo inalterado contra main.
Problema real de telemetria mantido fora deste ajuste visual, nao classificado
como falha ambiental; health/ready nao validam essa gravacao.

QA visual identificou heranca de whitespace-nowrap da action bar na modal
aberta por ReplyCard. Corrigida localmente com whitespace-normal e min-w-0 na
raiz da modal/sheet, sem mudar os outros modais. Build anterior preservado como
evidencia reprovada para esse estado. Novo build 0.1.756 aprovado e conferido em
320/390/1440px: texto quebra em duas linhas, sem corte, com rodape visivel.
Regressao Chrome adicional: 6/6 sem skips, incluindo controle negativo que
reproduz o corte ao retirar a correcao. Revisao final de codigo sem novos P1/P2.

QA real autenticada confirmou filtros agregados, paginacao, ocultar/reexibir,
privacidade, permissao do convite, foco/rascunho/gesto e envio unico do formulario
com um POST e persistencia exata. Teclado avaliado por viewport reduzida; nao e
teste fisico em Safari/iPhone. Capturas intermediarias de animacao foram
substituidas por capturas apos estabilizacao, com geometria do rodape registrada.
Galeria local atualizada: 26 vistas em 320/390/850/1440px, sem overflow, erros
ou requisicoes remotas; inclui a pagina de psicologos antes omitida.
Logs e manifestos desta rodada usam prefixo .tmp/task296-.

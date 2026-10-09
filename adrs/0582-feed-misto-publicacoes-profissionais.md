# ADR-0582: Feed misto com publicacoes originais de psicologos

## Status

Accepted

## Contexto

Complemento da TASK-23 autorizado em 2026-10-09. ADR-0581 excluia posts originais
sem video-resposta. O usuario aprovou espaco para psicologos verificados, mantendo
prioridade de pacientes respondidos e bonus moderado para video proprio.

## Decisao

- Paciente exige video-resposta direto/disponivel do ADR-0581. Psicologo ativo,
  nao excluido e verificado pode entrar sem respostas, com texto, imagem ou video.
- Separar por autor: profissional com respostas continua na fila profissional,
  sem duplicacao. Intercalar quatro pacientes e um profissional antes de paginar;
  esgotada uma fila, completar com a outra. Busca/comunidade/seguindo precedem o ciclo.
- Pacientes preservam ranking/diversidade atuais. Profissionais usam
  max(0, 1 + log2(1 + 3*uteis + comentarios + 2*shares) - penalidade - 0.6*downvotes)
  vezes decaimento de criacao, meia-vida de 14 dias. Bonus multiplicativo unico de 15%
  por video proprio disponivel. Texto recente/bem avaliado pode superar video antigo.
- Stream exige ready, nao excluido, owner/context corretos, purpose community_post.
  Legado usa referencia publica validada, sem HEAD por post (disponibilidade logica).
  Carrossel tem precedencia sobre midia unica como no serializer existente.
- Sem alteracao de frontend/layout, filtros internos de comunidades, contrato, schema,
  migrations, packages, env ou jobs. Backend independente e compativel com frontend atual.
  Rollback por reversao revisada sem dados. Commit local; sem push/deploy autorizado.

## Validacao

Pendente: testes, Prisma/TypeScript/Biome/build e leitura real de desenvolvimento.
Sem mocks de integracao, seeds ou escritas de conteudo para concluir.

## Complemento autorizado: variacao leve

Seed opcional inteiro positivo de ate 2147483647. Backend aplica fator deterministico
por ID/seed entre 0.95 e 1.05 antes de ordenar cada grupo; nao altera elegibilidade,
quota, nem ordenacao interna de comunidades. Sem seed, ranking anterior deterministico.
Variacao pode inverter relevancias proximas, nunca obriga troca a cada atualizacao.
Frontend apenas envia seed, incluido na chave de cache e em todas as paginas. Mantem
seed em retorno ao feed/remount na SPA; reload completo ou evento de refresh gera novo.
Nao embaralhar pagina isolada nem renovar seed ao carregar mais. Sem storage de PII.
Compatibilidade: backend antigo ignora campo opcional; frontend antigo recebe ordem base.
Limite explicito: paginacao continua viva, sem snapshot persistido; novas publicacoes,
remocoes e votos concorrentes podem mudar o conjunto como antes. A variacao em si nao
introduz repeticoes/omissoes entre paginas de um mesmo conjunto/seed.
Agora escopo backend/frontend, layout mobile-first existente preservado. Builder nao
exposto neste cliente; inventario/protos da TASK-23 continuam referencia sem redesenho.

Contrato de contexto conferido em resolveUploadContext/canAssociateVideoAssetReferences:
community_post usa SLUG DA COMUNIDADE, nao ID do post. Bonus segue esse contrato
existente; community_reply permanece vinculado ao ID do post. Sem migrar dados.

## Evidencias locais - 0.1.616

- 16 testes focais backend aprovados, incluindo 4:1, filas esgotadas, sem duplicacao,
  bonus de video, contexto Stream por slug, variacao limitada e deterministica.
- Frontend check aprovado, incluindo teste da sessao de seed e preservacao da ordem.
- pnpm check executado: guards/frontend aprovados; primeiro backend teve timeout no
  teste preexistente optional-auth-failure. Repeticao isolada aprovada, seguida de
  check backend integral aprovado (892/892, zero skips), sem alterar asserts/timeouts.
  Admin check aprovado; video check aprovado (87 pass, 11 skips preexistentes por
  ferramentas indisponiveis). Nenhuma mudanca funcional no admin/video.
- Builds backend e frontend aprovados em 0.1.616; backend reconstruido apos revisao
  do contexto community_post; Prisma validate aprovado. Sem schema/migrations.
- Integracao read-only real: 10 posts persistidos, 1 original profissional elegivel
  sem resposta e 9 excluidos do feed; cinco ordenacoes de comunidade preservadas.
- Smoke HTTP local: /health e /ready 200, backend /ping e frontend /version 0.1.616;
  /version no-store/noindex, rota feed HTML 200. Seed repetida preserva ordem e cinco
  seeds invalidas retornam 400; nenhuma escrita, seed artificial ou endpoint simulado.
- Limite: base local tem somente um post elegivel, sem video-resposta; variacao e
  proporcao com multiplos itens cobertas nos testes puros, nao alegadas no browser.
- Computer Use falhou ao iniciar o sandbox Windows, inclusive apos reset da sessao.
  Validacao visual local permanece pendente; nao substituir por deploy remoto.
  Proto Feed Comunidade.jpg inspecionado; Builder/Quick Copy nao exposto no cliente.
- API local iniciada com notificacoes/campanhas/cobranca, tunel, Swagger e Sentry
  desabilitados para smoke; sem migration, reset, upload, envio ou operacao produtiva.
- Bump executado uma vez: 0.1.615 -> 0.1.616 nos cinco manifests; check:version aprovado.
- Publicacao nao autorizada nesta etapa. Commit em homolog, sem push/deploy.

## Complemento de validacao e autorizacao

- Usuario autorizou producao e confirmou visual desktop com captura do feed local.
- Causa do erro local: next start em production recusa origem API localhost; porta 3334 tambem precisava de origem local exata. Corrigido apenas no processo de desenvolvimento, sem alterar seguranca/codigo/configuracao de producao.
- Browser integrado local em next dev: original profissional sem respostas carregado; mobile 390px sem overflow e desktop preservado. Sem escrita de post/voto/upload.
- Midia do registro local aponta para arquivo de teste preexistente em localhost:3000/local-test-media; porta indisponivel. Nao e erro do ranking nem dependencia produtiva; nao houve criacao de mock ou alteracao desse registro. Reproducao desse arquivo nao validada.
- Evidencias finais de deploy, gates, SHA e smoke serao anexadas ao PR desta publicacao. Rollback pelos artefatos anteriores, sem migracao/dados.

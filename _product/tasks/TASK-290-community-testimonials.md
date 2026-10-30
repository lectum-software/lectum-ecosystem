# TASK-290 - Depoimentos da comunidade

Status: validada localmente, versao 0.1.747. Sem push/deploy.

## Escopo aprovado

Referencia visual: previa local aprovada em .tmp/depoimentos-preview; PROTO-INVENTORY consultado. Builder nao disponivel nesta sessao. Mobile-first, base 390px.

- [x] Substituir Avaliacoes por Depoimentos nas superficies do produto; remover media e links externos de coleta.
- [x] Permitir um depoimento por paciente/profissional, com estrelas de 1 a 5 e texto obrigatorio; sem exigir contato, terapia ou resposta direta.
- [x] Placeholder: Conte como voce se sentiu com este psicologo, se ele foi respeitoso e acolhedor. Sem checkbox de consentimento ou Escolha sua nota.
- [x] Autor pode editar/excluir. Profissional pode ocultar/reexibir e responder uma unica vez, editando/excluindo sua resposta. Nao permitir terceiros ou novas profundidades.
- [x] Plano gratuito nao recebe novos depoimentos; downgrade preserva exibicao e gestao dos existentes.
- [x] Publico ve apenas relatos visiveis e contagem, sem media. Autor mantem o proprio relato sem indicador Oculto.
- [x] Modal na pagina de psicologos segue comentarios dos reels; perfil e modal permitem publicar quando elegivel.
- [x] Convite junto a resposta em video, suprimido quando ja houver depoimento.
- [x] Menu do psicologo: Meus depoimentos imediatamente abaixo de Editar perfil. Paciente: Meus depoimentos.
- [x] Plano Profissional: Receba depoimentos da comunidade; sem mencao no gratuito.
- [x] Notificacao agrupada e lista de profissionais pendentes, sem notificar a cada resposta.
- [x] Testes de permissao, assinatura, unicidade, visibilidade, edicao, resposta e agrupamento; checks/builds e QA local.

## Seguranca e rollout

### Refinamento visual solicitado em 30/10

- [x] Convite azul no perfil e na modal, mantendo convite discreto junto as respostas.
- [x] Quantidade de depoimentos com badge azul e peso reforcado no titulo e na aba.
- [x] URL publica usa tab=depoimentos; links tab=avaliacoes continuam funcionais e
  sao normalizados sem perder outros parametros ou provocar rolagem.
- [x] Modal e formulario sobem em 320ms, respeitando prefers-reduced-motion.
- [x] Galeria somente leitura das telas reais autenticadas, sem exigir login.

Previa separada do novo header/CTA em .tmp/profile-cta-preview/index.html; nenhuma
dessas mudancas de proposta foi aplicada ao produto. Galeria da implementacao em
.tmp/depoimentos-implemented-preview/index.html, com capturas reais 390/1440px de
contas temporarias removidas ao final. QA autenticado confirmou nova URL, azul,
animacao, movimento reduzido e fluxos de gestao existentes; nenhuma conta real usada.

Validacao do refinamento: Biome/lint/typecheck aprovados; todas as suites do check
frontend aprovadas apos mover a animacao para a fundacao global (o loader SSR nao
carrega CSS modules). 15 testes focados de depoimentos passaram. Build frontend
0.1.747 aprovado em copia isolada dos fontes, um worker e cache desabilitado.
Gates raiz de versao, segredos, encoding, ADRs, tasks, source-safety, env, tamanho
e ciclos aprovados. Galeria verificada em 24 selecoes de telas/tamanhos; proposta
header/CTA validada em 320, 390 e 1440px. Evidencias: .tmp/testimonials-refinement-*,
.tmp/task290-browser-results.json e design-qa.md nas duas pastas de previa.

Preservar rotas/contratos antigos de forma aditiva, sem renomear tabelas ou remover campos neste rollout. Nao acessar dados remotos em testes. Ajustes de reels previamente commitados permanecem intactos. Publicacao depende de autorizacao posterior.

## Pendente de refinamento

Cadencia temporal de notificacoes nao foi fixada pelo usuario. Implementacao deve evitar disparos repetidos e registrar a politica escolhida sem disparar campanhas retroativas.

## Evidencias locais

- Frontend check passou; regressao final de componentes/HTTP: 12 testes passaram.
- Backend check: 1107 testes passaram. Admin check passou. Video check: 96 passaram,
  13 testes de integracao sem infraestrutura foram ignorados pelo runner existente.
- Builds backend e frontend passaram. Frontend compilado em copia isolada fiel aos
  fontes, cache webpack desabilitado e um worker para limitar memoria. Nenhuma
  configuracao de producao foi flexibilizada para permitir API localhost.
- Check agregado foi interrompido por falta de recursos do Windows durante Admin;
  gates restantes retomados separadamente. Gates de segredo, encoding, ADRs, tasks,
  source-safety, env, tamanho, ciclos, formatação e versao validados.
- QA com banco PostgreSQL local real e contas temporarias: publicar, editar,
  impedir duplicacao/acesso de terceiro, responder/editar resposta, ocultar/reexibir,
  preservar relato no downgrade e bloquear novos, excluir pelo autor.
- Telas conferidas em 320, 390, 1024 e 1440px: perfil, diretorio, modal, formulario e
  menu profissional. Wheel desktop nao move feed nem perde rascunho.
- Harness usa contexto isolado por conta e uma sessao ativa por fixture. Nao ha
  contas de teste permanentes, requisicoes externas ou alteracoes em producao.
- Logs/capturas locais em .tmp/task290-*. O analytics page-view do ambiente isolado
  retornou 500 em algumas execucoes; nao bloqueou os fluxos de depoimentos.
- Sem migration ou env nova. Publicacao futura: backend primeiro, frontend depois.
  Os ajustes de reels da TASK-289 foram preservados.

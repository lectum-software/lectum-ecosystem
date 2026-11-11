# TASK-329 - Gestao administrativa de precos versionados

Data: 2026-11-11
Status: Concluida localmente — 0.1.822, 11/11/2026
Dependencias: TASK-323, TASK-328
Decisao: [ADR-0694](../../adrs/0694-admin-versioned-price-management.md)

## Objetivo e limites

Concluir a gestao do preco de novas adesoes no Admin, com criacao de nova versao
Stripe, historico, vinculo pausado, publicacao explicita e pausa local. Preservar
MP implementado e desabilitado para novas adesoes conforme configuracao atual.

Somente implementacao/validacao local e sandbox existente. Nenhuma mudanca live,
permissao live, preco produtivo, venda, cobranca, emissao ou Radar. Sem push/deploy.
Nao reprecificar contratos, renovar com preco novo, prorratear, arquivar Price
antigo, ativar gates globais ou alterar legado subscription_plan para mascarar
uma oferta versionada. Editor de despesas e tarefa seguinte.

## Contrato de dominio

- BRL, mensal, quantidade1, produto Profissional existente; preco novo e imutavel.
- Valor em centavos inteiro, minimo50 e maximo99999999 como limites tecnicos
  defensivos. Sem preco zero; cortesia segue fluxo existente, nao Price gratuito.
- Criar versao nao publica oferta. Vinculo de versao diferente pausa por padrao;
  habilitacao exige confirmacao explicita, revisao CAS e readiness/gates existentes.
- Escopo conta/modo/produto derivado do servidor; payload nao escolhe conta/modo.
- Pausa de novas adesoes e local, CAS/auditada, mesmo se gateway estiver fora.
- Contratos/reservas ja fixados conservam snapshot/preco; vitrine de novas
  adesoes usa a mesma versao da cotacao, sem anunciar o valor do plano legado.
- Operacao de catalogo duravel e propria, com request key/fingerprint/ator/escopo,
  idempotencia Stripe, correlacao sem PII e recuperacao de resposta perdida.
  Nunca manter transacao SQL aberta durante chamada ao provider nem repetir
  criacao cegamente apos a janela de idempotencia. Nao reutilizar billing_operation
  de checkout e nao armazenar payloads secretos/integral de provider.
- Factory/adapter atuais, sem SDK paralelo, dependencias ou env obrigatoria nova.
- APIs aditivas, erro publico seguro, logs apenas categoria/correlacao; auditoria
  atomica para alteracoes locais. Historico paginado, ordem estavel.

## Permissoes e requisito externo

Evidencia anterior registra Prices/Products Write no sandbox; reconferir por
operacao de catalogo de teste sem ampliar chave. Live registra Prices/Products
Read: criar valores pelo Admin em producao exigira autorizacao especifica futura
para Prices Write (nao Products Write). Nao ampliar agora e nao usar chave total.
Se requisito externo impedir ensaio real, registrar pendente, nunca mockar.

## Visual e arquitetura

Consultar PROTO-INVENTORY e imagens locais Admin Configuracoes/Assinatura.
Builder indisponivel: registrar fallback, reutilizar cards/diálogos/controllers
RHF/Zod existentes. Mobile-first390px e desktop, slots de erro estaveis.

## Aceite

- [x] Criacao de nova versao sem venda/cobranca, escopo/imutabilidade verificados.
- [x] Idempotencia/recuperacao duravel, conflitos e permissoes tratados sem duplicar.
- [x] Historico, vinculo pausado, publicacao explicita e pausa offline auditados.
- [x] Contratos/reservas anteriores preservados e vitrine/cotacao coerentes.
- [x] Testes unitarios/PG real, migration local, checks e builds aprovados.
- [x] Browser local390/desktop e catalogo real do sandbox, sem mocks financeiros.
- [x] ADR/task, bump unico/cinco manifests e commit homolog; sem push/deploy.

## Deploy e rollback

Migration expansiva nova; db:migrate somente PG QA local, nunca reset/drift
silenciado. Backend aditivo antes de Admin/frontend. Feature nao ativa vendas nem
muda oferta ao publicar codigo; contratos antigos continuam legiveis. Rollback
preserva operacoes/versoes e nao apaga Price remoto. Live Prices Write permanece
acao autorizada separadamente, sem segredos em Git/logs ou arquivos novos.

## Evidencias locais / sandbox

- Migration expansiva `20261111210000_billing_catalog_operations` aplicada com
  `pnpm --dir backend db:migrate` somente PG QA127.0.0.1:32768; em sincronia,
  sem reset. Prisma Client gerado; SQL aplicado nao foi editado depois.
- Testes unitarios/SSR reais de catalogo, isolamento, preco variavel, vitrine,
  armazenamento pendente/ator, CAS, gates e recuperacao aprovados. PG real cobre
  reserva concorrente/lease/fingerprint e snapshot da vitrine, sem providerfake.
- Price39,90 criada pelo Admin/API real com chave restrita test existente:
  factory conferiu conta/modo/produto/contrato; nao mudou a oferta2990.
- Replay HTTP do mesmo request key retornou a mesma operacao/versao; valor
  conflitante e revisao obsoleta retornaram409, sem nova criacao/alteracao.
  Paginacao real em duas paginas (limit1), sem repetir versao.
- Interrupcao controlada depois de criar Price49,90 real e antes do commit local:
  lease real90s expirou, Admin recuperou o mesmo recurso. Observador oficial de
  requests do SDK (harness QA, sem alterar payload/rede) contou1GET de lista e
  **zero POST de Price** na recuperacao; identidade remota preservada.
- Vínculo39,90 pausado comprovado no browser. Publicacao bloqueada por400 com
  gates do servidor desligados e botao correspondente desabilitado no Admin.
- Publicacao positiva somente em processo tecnico isolado, sem HTTP listener,
  bootstrap ou workers, configuracao test em memoria. Vitrine real do banco e
  cotacao Stripe concordaram em3990centavos/mes e mesma revisao. A renderizacao
  SSR do componente real exibiu39,90, nao o legado29,90. Nenhum checkout iniciado.
- Processo novo sem STRIPE_SECRET_KEY pausou a oferta que estava habilitada:
  prova positiva de pausa offline, sem SDK/fallback de credencial. Oferta original
 2990 restaurada pelo Admin e deixada pausada (mais seguro que reativar o cadastro
  local anterior), com revisao/auditoria monotonicamente incrementadas.
- Browser Admin/usuario390/1440 sem overflow; erro monetario manteve altura392px
  da secao. Confirmacao mobile, historico, recuperacao, globaldisabled e vitrine
  pausada conferidos visualmente. Sem preco legado anunciado como venda atual.
- Autenticacoes QA restauradas (duas sessoes Admin em passagens separadas e
  uma sessao de usuario removidas),
  precos antigos imutaveis e12 tabelas financeiras/fiscais protegidas identicas;
  nenhum pagamento, invoice, contrato, reserva ou perfil profissional alterado.
  Duas novas versoes reais do catalogo sandbox e suas auditorias foram preservadas.
- Sem Stripe live, SendNF, Radar, provider permissions, gates publicados ou VPS.
  Novas vendas e todos os workers do servidor QA permaneceram desligados.

Builder/Quick Copy nao existe nas ferramentas habilitadas; imagens locais de
Configuracoes e Planos de Assinatura consultadas. Novos componentes reutilizam
controllers/tokens, sem package novo.

Incidentes de ferramenta contidos: um comando pnpm global do subagente alterou
lock/workspace frontend; a primeira tentativa de commit sem PATH fixo fez o hook
resolver o pnpm global e repetir o problema tambem no Admin. Commit bloqueado,
sem alterar a versao novamente. Restaurados somente lock/workspace antes limpos
e dependencias reconstituidas offline/frozen com pnpm10.33.0 fixo. Retry do Git
executado no mesmo ambiente mise fixado para propagar PATH aos hooks.
Nao houve upgrade de dependencia; locks/workspace permanecem sem diff.

## Limites de publicacao

- Preco produtivo segue29,90. Esta task nao autoriza criacao ou publicacao live.
- Chave live tem Prices Read no inventario anterior. Criar valores live pelo
  Admin requer Prices Write mediante confirmacao especifica, nao Products Write.
  Se ausente, operacao falha de forma segura/preservada, nao ativa vendas.
- Publicar backend/migration aditivos primeiro e concluir frontend/Admin antes de
  usar editor live. Codigo novo nao troca a versao vigente automaticamente.
- Tarifas reais e despesas nao sao o mesmo que preco; seguem tasks separadas,
  sem percentual estimado apresentado como tarifa paga.

Verificacao final de hidratacao em browser real: editor e historico prontos em
processo novo sem chaves do provider, sem enviar formulario. Estado de pendencia
isolado por ator/escopo antes da primeira pintura e sem setState sincrono no
effect. Lint real sem disable, TypeScript e26 testes focais aprovados.
Builds backend/Admin/frontend de0.1.822 aprovados; caches de dev gerados foram
retirados da arvore de build, sem alterar dados. Bump0.1.822 executado uma unica
vez; cinco manifests sincronizados. Sem alteracao em locks ou packages.

Check integral da raiz final aprovado (exit0), incluindo checks backend/Admin/
frontend/video, versao, segredos, arquitetura e testes. Commit local em homolog;
publicacao permanece nao autorizada para estas novas tasks.

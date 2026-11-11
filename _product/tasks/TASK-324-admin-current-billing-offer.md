# TASK-324 - Oferta vigente de assinatura no Admin

Data: 2026-11-11
Status: Validada localmente em 0.1.815; commit local, sem push/deploy
Dependencias: TASK-142, TASK-323, TASK-02, autenticacao Admin existente
Decisao: [ADR-0689](../../adrs/0689-admin-current-billing-offer.md)

## Pedido e evidencia

O usuario pediu priorizar pendencias administrativas enquanto nao possui acesso
a conta pagadora. A verificacao de plano/NFS-e pela sessao do titular permanece
pendente; nao substituir login do titular nem iniciar outra assinatura.

Configurar Assinatura ainda consulta somente subscription_plan.price_cents e o
vinculo legado MP, mas afirma exibir o preco vigente para novas adesoes. O checkout
Stripe usa billing_offer e billing_price_version no escopo da conta/modo. A leitura
administrativa precisa refletir essa distincao, inclusive ofertas pausadas.

## Escopo unico

- Estender GET /api/admin/private/settings/subscription-plan de forma aditiva.
- Preservar plan e seus campos legados. Acrescentar checkout com diagnostico local,
  gateway selecionado, modo, estado, flags de collection/reconciliation,
  oferta/revisao/data e preco versionado/moeda/cadencia, quando validos.
- Consultar oferta e preco por plano/gateway/conta/modo, incluindo oferta pausada
  e plano inativo; validar identidade e politica de preco existentes sem rede.
- Estado configurado significa apenas configuracao local coerente. Readiness
  remoto permanece not_checked; nao afirmar que o provedor esta disponivel.
- Conta, chaves, IDs externos de produto/preco e detalhes tecnicos nao saem no DTO.
- Ausencia ou inconsistencia da oferta nunca usa o valor legado como preco Stripe.
- Gateway desativado, pausa de oferta e plan.active permanecem conceitos distintos.
- UI mobile-first na rota existente, com fonte explicita, aviso somente leitura e
  fallback honesto para backend antigo. Reutilizar client/req/caller/tokens atuais.

## Limites

Sem CRUD de preco, ativacao/pausa, recuperacao, cobranca, cancelamento, emissao,
consulta a provider, chave/env nova, pacote, migration ou alteracao de producao.
Editor comercial versionado e historico/NFS-e administrativo sao proximas tasks
separadas, nao parte deste fechamento. Nao simular readiness nem pagamento.

Referencia visual: PROTO-INVENTORY e export local Configuracoes do Admin,
preservando a tela da TASK-142. Builder/Quick Copy nao esta disponivel nas
ferramentas deste cliente. Validar primeiro em390px, tambem320px e desktop.

## Aceite

- [x] Backend consulta oferta/preco reais no mesmo escopo e preserva contrato antigo.
- [x] Estados habilitado localmente, pausado, ausente e invalido nao se confundem.
- [x] Sem segredo/PII/IDs externos, chamadas a provider ou efeitos financeiros/fiscais.
- [x] Admin distingue novas adesoes, preco versionado e plano legado; fallback antigo.
- [x] Testes puros e PostgreSQL real isolado cobrem estados, escopo e preco invalido.
- [x] Check raiz, check/build backend e admin aprovados.
- [x] Browser local autenticado com API/DB reais, mobile-first e sem mocks aprovado.
- [x] ADR e modelo de dados atualizados, bump unico/check version, commit local homolog.

## Deploy e rollback

Contrato aditivo: backend antes do admin. Admin novo sem checkout mostra dado legado
como cadastro, nao como oferta atual; admin antigo continua compativel. Sem env nova
ou migration. Rollback apenas de codigo, sem tocar catalogos/contratos. Nenhum push
ou deploy autorizado nesta rodada; commits ficam locais. Evidencias locais abaixo; producao preservada.

## Evidencias locais — 11/11/2026

- Consulta usa transacao PostgreSQL READ ONLY/RepeatableRead: plano, revisao da
  oferta e preco vem do mesmo snapshot. Politica de preco pura compartilhada com
  checkout preserva o contrato atual2990BRL/mensal, sem alterar cobranca.
- 14 testes focais backend (politica e PostgreSQL real opt-in) aprovados, incluindo
  escopo cruzado, preco ausente/invalido e publicacao concorrente. 16 testes de
  apresentacao/SSR Admin aprovados; nao substituem prova de provider.
- Banco QA isolado estava vazio: restaurado o dump existente de10/11 somente apos
  confirmar0tabelas, host127.0.0.1/porta32768/baselectum_stripe_test. Sem clean/reset
  ou seed produtivo. db:migrate aplicou duas migrations preexistentes; esta task
  nao altera schema/migrations. Banco preservado apos o teste.
- Login normal no Admin local, API e DB reais, oferta Stripe sandbox existente
  pausada pelas travas de collection/reconciliation. Nenhum worker financeiro foi
  habilitado. Layout conferido em390px,320px e1440px, sem overflow horizontal.
  Queda/retorno do backend local conferida; a autenticacao global redireciona ao
  login durante indisponibilidade e recupera a sessao apos retorno. Nao alegar
  exercicio do botao especifico de retry da oferta nesse cenario.
- Senha temporaria do administrador QA restaurada e unico token da rodada
  removido. Fingerprints e contagens de14tabelas de negocio identicos antes/depois:
  oferta1, preco1, contratos4, recibos3, jobs fiscais0 e notas0. Sem SDK/provider,
  cobranca, emissao ou alteracao do banco publicado.
- Builder/Quick Copy indisponivel; export Configuracoes do Admin e padroes atuais
  usados. Screenshots `task324-admin-offer-{320,390,1440}.png`, logs e evidencia
  `admin-offer-auth-evidence-0324.json` em diretorio privado de QA fora do Git.
- Bump unico0.1.815 nos cinco manifests; sem nova env obrigatoria. Servidores de
  QA encerrados ao fim. Validacao do titular em producao continua pendente.

## Proximos incrementos separados

1. Historico financeiro/NFS-e no Admin: hoje a aba de cobrancas nao apresenta
   documento fiscal/download nem todo o historico canonico Stripe. Exige endpoint
   dedicado com RBAC/auditoria, sem reutilizar acesso owner-scoped do cliente.
2. Editor comercial: publicar nova versao de preco com CAS/idempotencia/auditoria,
   preservando preco dos contratos existentes. Nao acrescentar um PATCH simples
   em subscription_plan nem alterar o valor das assinaturas retroativamente.

## Fechamento

- `pnpm check` integral aprovado (frontend/backend/admin/video e guardas).
- `pnpm --dir backend check` e `build` aprovados; suite backend1387PASS/23SKIP,
  sem falha. Os skips externos gerais nao foram usados como prova desta task.
- `pnpm --dir admin check` e `build` aprovados. Primeiro build compilou, mas o
  gate de sourcemaps encontrou artefatos de next dev em `.next/dev`; somente esse
  output local regeneravel foi removido apos encerrar o dev server. Repeticao
  integral do build passou, sem alterar/desabilitar o gate. Aviso preexistente
  de deprecacao do import Sentry nao foi tratado como falha do produto.
- Revisao cruzada backend/Admin concluida sem achados P1/P2. `git diff --check`,
  `check:version`, ADRs/tasks aprovados. Nenhum pacote, env obrigatoria ou migration
  novo; bump unico0.1.815. Commit em homolog, sem push/deploy ou nova transacao.

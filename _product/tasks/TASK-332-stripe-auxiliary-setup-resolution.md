# TASK-332 - Correlacao segura do SetupIntent auxiliar Stripe

Data: 2026-11-11
Status: Validada localmente em 0.1.826; publicacao e reconciliacao autorizadas, em andamento
Dependencias: TASK-323, TASK-331
Decisao: [ADR-0697](../../adrs/0697-stripe-auxiliary-setup-provenance.md)
Modelo: DATA-MODEL.md, inbox Stripe.

## Objetivo e causa comprovada

Encerrar o auxiliar sem nova cobranca, emissao fiscal, atribuicao de cartao,
confirmacao de checkout ou mudanca de Radar/infraestrutura. Workbench autenticado
confirmou novamente evento original setup_intent.succeeded: fonte POST de
atribuicao default_payment_method de Subscription HTTP200; key credit-card
identica no Event.request e no log. Sem metadata/pin, o classifier retorna
unresolved por seguranca, mas falta distinguir essa origem auxiliar comprovada.

## Contrato

- Hash SHA256 da key credit-card estrita, somente de webhook assinado com API,
  conta/modo validos. Helper preserva derivacao atual. Nunca aceitar prova do cliente.
- Campo nullable aditivo na inbox. Redelivery enriquece null para hash com CAS
  sobre referencias imutaveis, sem mudar estado/lease/tentativas/processed_at.
  Hash divergente falha fechado; nao sobrescrever.
- Fallback somente succeeded sem candidatos principais, com GETs canonicos e
  origem exata, customer/owner/conta/modo/sub/cartao pinados e um checkout manual
  completo inequivoco. Metadata invalida nao equivale a ausencia.
- Cartao trocado ou contrato cancelado posteriormente nao apagam historia;
  validar vinculos historicos sem exigir default atual ou reativar o contrato.
- Ramo auxiliar reconhece somente a inbox, sem sync, confirm, assignment,
  collectors ou SendNF. Ambiguidade/overflow/ausencia de prova ficam em revisao.
- Historico: redelivery ORIGINAL assinada para enriquecer prova; dry-run e requeue
  unitario auditado existentes. Nao fabricar evento/assinatura, marcar complete
  por SQL avulso nem executar worker amplo manualmente.

## Deploy e limites

Sem UI/env obrigatoria/package novo; MP preservado e apps separados. Migration
expansiva antes do novo backend, nullable compativel com versao anterior. Rollback
preserva coluna/evidencia. Publicacao por PR homolog para main com autorizacao,
gates locais, autodeploy homolog neutralizado e smoke; usuario autorizou PR e
reconciliacao dos dois auxiliares comprovados. Nao usar builds VPS para contornar falta
de validacao local. Logs/retencao e infraestrutura permanecem fora do escopo.

## Aceite

- [x] Origem atual conferida por GET oficial do evento/request originais.
- [x] Prova assinada minima e enriquecimento monotonicamente seguro.
- [x] Auxiliar reconhecido sem alterar setups principais ou pins terminais.
- [x] Ausencia/conflito de prova e divergencias/ambiguidades bloqueadas.
- [x] PostgreSQL local real: dedupe/CAS/lease/requeue e zero efeitos financeiros/fiscais.
- [x] Sandbox com objetos/eventos existentes, sem criar cobrancas/notas.
- [x] db:migrate, Prisma, TypeScript, Biome, check integral e build backend locais.
- [ ] Revisao independente, bump unico/cinco manifests/check:version, commit homolog.
- [ ] Se autorizado: PR/checks/merge/smoke e historico encerrado com auditoria.
- [ ] Fingerprints preservam pagamentos, plano/cartao, recibos e notas.

Evidencias sanitizadas privadas em lectum-stripe-qa/setup-closure-20261111, fora
do Git. Sem payload integral, segredo, client_secret, CPF/email/nome ou dados de
cartao. Teste unitario nao substitui prova externa. Sem interface, proto/browser
local nao se aplicam; somente conferencia operacional dos paineis existentes.

## Validacao local e preflight

Node24.22.1/pnpm10.33.0: check integral da raiz e build backend aprovados. Migration
nullable aplicada por db:migrate no PG QA loopback isolado, sem reset/drift;
Prisma gerado. Tres testes de integracao PG reais aprovados sem skips: prova
monotonica da inbox, reconhecimento auxiliar e requeue unitario auditado. Cobrem
concorrencia/CAS, replay, referencias/hash divergentes, TTL expirando enquanto
aguarda rowlock, ausencia de efeitos de negocio e preservacao de tentativas.
Units/projecoes/SDK/guardas principais aprovados; revisao independente sem P1/P2.

Sandbox: sete GETs oficiais em objetos existentes, zero escrita. Tres setups
nao elegiveis permaneceram unresolved e 17 conjuntos locais ficaram identicos.
Nao existe checkout manual-credit pinado correspondente nos dados sandbox atuais;
nao reconstruir bindings para fabricar positivo. Prova positiva do fallback e
persistencia local real; entrega assinada produtiva ainda depende do rollout.

Preflight live somente leitura: alvo original review_required/10 tentativas; um
segundo auxiliar pending/9, com backoff preservado. Ambos tem origem credit-card
comprovada no evento original e request HTTP200, sem metadata. O segundo contrato
esta cancelado; nenhum reconhecimento pode reativar plano/cartao ou apagar esse
historico. Os 17 fingerprints do diagnostico permaneceram iguais durante leituras.
Backend/frontend/Admin0.1.824 saudaveis; nenhuma escrita produtiva nessa fase.

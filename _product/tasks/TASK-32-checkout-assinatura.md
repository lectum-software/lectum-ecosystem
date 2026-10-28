# TASK-32: Checkout de assinatura

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-32 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Assinatura |
| Status | Completed |
| Dependências | TASK-02, TASK-03, TASK-31 |
| ADR alvo | ADR de checkout e gateway de pagamento |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Finalizar Assinatura - Psicólogo.jpg` | `figma-design-frame-40-Finalizar-Assinatura---Psic-logo.html` |
| `_product/proto/Endereço de Faturamento - Layout Ajustado.jpg` | `figma-design-frame-25-Endere-o-de-Faturamento---Layout-Ajustado.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Esta task não pode avançar sem gateway real. O frontend pode coletar endereço e iniciar sessão de pagamento, mas não pode simular pagamento aprovado.

## Objetivo

Implementar checkout real de assinatura com endereço de faturamento e gateway decidido.

## Pré-requisitos e bloqueios

- Provedor **decidido: Mercado Pago** (ADR-0003; ver `DATA-MODEL.md` › "Assinatura e cobrança"). O bloqueio restante são as **credenciais** (access token + public key, sandbox/prod): sem elas, construir o fluxo/adapter mas **não** transacionar ao vivo nem ativar assinatura — parar e registrar pendência.
- O fluxo deve ser **agnóstico ao gateway**: implementar atrás da porta `PaymentGateway`; só `MercadoPagoAdapter` conhece o MP. Nenhum import do SDK do MP fora do adapter.
- Cartão de crédito tokenizado **client-side** (Checkout Bricks); PAN/CVV nunca tocam o backend. Persistir apenas `payment_method.gateway_token` + display; nunca PAN/CVV. Débito e pré-pago ficam fora do MVP.
- CEP via controller `cep` da TASK-02; não criar consulta de CEP paralela.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/professional/billing/checkout`
- `/app/professional/billing/address`

Implementação esperada:

- Criar tela de checkout e endereço de faturamento.
- Validar dados fiscais/endereço com Zod (fundação TASK-02; CEP via controller `cep`).
- Coletar e tokenizar o cartão de crédito com o **Card Payment Brick do Mercado Pago** (SDK MP no client); enviar ao backend apenas o `card_token` (nunca PAN/CVV).
- Exibir erro de pagamento, pendente e sucesso conforme retorno real (status normalizado do `DATA-MODEL.md`).
- Não armazenar dados sensíveis de cartão no frontend fora do provedor.

## Escopo backend

Implementação esperada:

- Implementar a porta `PaymentGateway` + `MercadoPagoAdapter` (ver `DATA-MODEL.md` › "Abstração de gateway"); o service depende da porta, não do SDK.
- Criar a assinatura via **Preapproval** do MP com o `card_token` recebido (`auto_recurring` mensal, `external_reference` = `professional_subscription.id`); guardar o `id` do preapproval em `gateway_subscription_id`.
- Persistir endereço de faturamento permitido.
- Criar/atualizar `professional_subscription` com status **normalizado** do MP (mapa no `DATA-MODEL.md`); só ativar via webhook confirmado.
- Validar plano e usuário profissional.
- Não ativar plano sem confirmação real do gateway/webhook.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md` › "Assinatura e cobrança"; usar nomes/campos exatos, sem inventar):

- `billing_address` (`zip/street/number/complement?/district/city/state`; CEP via controller `cep` da TASK-02).
- `professional_subscription` (criada/atualizada conforme webhook; `status` `"inativa"|"ativa"|"inadimplente"|"cancelada"`; nunca ativar sem confirmação real do gateway).
- `payment_event` (registro bruto do webhook; `@@unique([gateway, external_id])` para idempotência).

Endpoints esperados:

- POST `/api/private/psychologist/billing/checkout`
- PUT `/api/private/psychologist/billing/address`
- POST `/api/public/billing/webhook` — tópicos MP `subscription_preapproval`/`subscription_authorized_payment`/`payment`; **validar `x-signature` (HMAC-SHA256, manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`) antes de processar**; só então persistir `payment_event` (idempotente) e refletir status normalizado em `professional_subscription`.

**Guarda de papel:** as rotas de checkout/endereço de billing são exclusivas de psicólogo. Vivem sob `/api/private/psychologist/billing/*` e são protegidas por `requireRole("psicologo")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`, sem `next()`). O escopo de ownership é feito por `req.auth.id`. O webhook `POST /api/public/billing/webhook` **permanece público** (chamado pelo gateway, não autenticado por usuário; autenticidade via verificação de assinatura do provedor). Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

## Contrato técnico detalhado

Arquitetura frontend obrigatória:

- Telas em `frontend/src/app/{rota}/page.tsx`, `logic.tsx` e `use-form.tsx` quando houver formulário.
- Chamadas HTTP em `frontend/src/api/req/{dominio}/index.ts` usando `callEndpoint` e `handleReq`.
- Hooks React Query em `frontend/src/api/callers/{dominio}/index.tsx`.
- Query keys em `frontend/src/api/cache/keys.ts`.
- Shells/templates em `frontend/src/templates`.
- Componentes existentes em `frontend/src/registry/new-york-v4/ui` e `frontend/src/components/ui` devem ser reutilizados antes de criar novos.
- Quando houver formulário ou campo, usar `frontend/src/hooks/form`, `frontend/src/components/controllers`, React Hook Form e Zod conforme `TASK-02`.

Arquitetura backend obrigatória:

- Novas APIs em `backend/src/modules/api/{public|private}/{dominio}/{caso}`.
- Rotas registradas em `backend/src/main/server/imports/write.ts`.
- Validadores em `validator/index.ts` usando os helpers/pacote local de validação.
- Services e repositories separados quando houver regra de domínio ou persistência.
- Respostas usando `send`, `error500`, `error` e traduções em `backend/locales/pt/translation.json`.
- Prisma com nomes e padrões já definidos em `ARCHITECTURE.md`.

Packages permitidos nesta task (instalar só aqui, com ADR; ver `PACKAGES.md`):

- `mercadopago` (SDK Node, backend) — só dentro do `MercadoPagoAdapter`.
- `@mercadopago/sdk-react` (Checkout Bricks, frontend) para o Card Payment Brick.
- React Hook Form, Zod, Prisma (já instalados).

Regras anti-recriação específicas:

- Procurar componente, helper, model, endpoint e query key equivalente antes de criar estrutura nova.
- Não criar client HTTP paralelo, store paralela, autenticação paralela, validator paralelo ou design system paralelo.
- Não usar `sample/` como referência direta de implementação futura.
- Não instalar package novo sem consultar `PACKAGES.md` e registrar ADR.

## Estados obrigatórios

- Loading inicial.
- Erro de rede/API em PT-BR.
- Estado vazio quando não houver dado real.
- Sucesso com feedback visual discreto.
- Responsividade mobile-first baseada nas imagens exportadas.

## Fora do escopo

- Criar dados fake, seed artificial ou mock para preencher tela.
- Concluir integração externa ausente.
- Refatorar módulos não relacionados à task.
- Trocar package manager ou stack base.

## Critérios de aceite

- [x] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [x] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [x] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Rotas sob `/api/private/psychologist/*` exigem `requireRole("psicologo")` (fail-closed), conforme ADR-0002; o webhook `/api/public/billing/webhook` permanece público.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.

## Execucao parcial de fluxo em 2026-06-07

- A rota `/app/professional/billing/checkout` foi criada apenas como tela honesta de bloqueio para o fluxo pago.
- O CTA do plano profissional aponta para essa rota para manter a ordem solicitada: planos -> pagamento.
- Nenhum checkout, SDK Mercado Pago, tokenizacao de cartao, webhook, endereco de faturamento persistido ou assinatura profissional ativa foi implementado.
- TASK-32 continua Pending/Bloqueada operacionalmente ate existirem credenciais reais Mercado Pago (`MERCADO_PAGO_ACCESS_TOKEN`, public key e segredo de webhook) e contrato final de checkout.

## Ajuste de ordem solicitado em 2026-06-07

- Pedido direto de produto: no plano de assinatura, o endereço de faturamento deve vir depois da confirmação do pagamento.
- Enquanto a TASK-32 segue pendente por credenciais Mercado Pago, a tela de checkout informa que a próxima etapa real, após webhook/assinatura ativa confirmada, será `/app/professional/billing/address`.
- A tela de endereço permanece honesta e sem persistência enquanto o pagamento real estiver bloqueado; quando liberada, ela deve salvar o endereço e seguir para `/app/professional/whatsapp/verify`.
- Ordem operacional paga atualizada: plano -> pagamento confirmado -> endereço -> telefone -> CRP -> perfil.

## Bloqueio operacional em 2026-06-27

- A execução foi retomada para a TASK-32, mas o bloqueio obrigatório de credenciais Mercado Pago permanece ativo.
- Evidência local: `.env` e `frontend/.env.local` não existem; `backend/.env` e `frontend/.env` não possuem chaves `MERCADO_PAGO`, `MERCADOPAGO`, `MP_`, `PAYMENT` ou `WEBHOOK`.
- Sem `MERCADO_PAGO_ACCESS_TOKEN`, public key client-side e segredo de webhook, a task deve parar conforme os pré-requisitos: nenhum SDK foi instalado, nenhum adapter/checkout real foi implementado e nenhum schema/migration foi alterado.
- As referências visuais da task foram identificadas em `_product/tasks/PROTO-INVENTORY.md` e permanecem disponíveis em `_product/proto/Finalizar Assinatura - Psicólogo.jpg` e `_product/proto/Endereço de Faturamento - Layout Ajustado.jpg`, mas a implementação visual não avançou por depender do gateway real.
- Critérios de aceite permanecem desmarcados; não houve simulação de pagamento, ativação de assinatura, seed, mock ou endpoint fake.
- ADR registrado: `adrs/0172-bloqueio-checkout-mercado-pago-credenciais.md`.

## Conclusão em 2026-06-27

- Bloqueio de credenciais resolvido: o usuário salvou localmente access token, public key e segredo de webhook do Mercado Pago nos arquivos `.env` correspondentes; os valores não foram versionados nem expostos nos commits.
- Builder Quick Copy não esteve disponível como ferramenta executável neste ambiente; a implementação visual usou as imagens locais indicadas em `_product/proto/Finalizar Assinatura - Psicólogo.jpg` e `_product/proto/Endereço de Faturamento - Layout Ajustado.jpg`.
- Implementado checkout real com Card Payment Brick no frontend, enviando ao backend apenas `card_token`.
- A experiência de checkout foi ajustada para aceitar somente cartão de crédito: o Brick oculta débito/pré-pago e o backend exige `payment_type_id = credit_card` e rejeita valores diferentes.
- Implementada porta `PaymentGateway` com `MercadoPagoAdapter`, Preapproval mensal, persistência de assinatura pendente e ativação somente por webhook assinado.
- Implementados `billing_address` e `payment_event` com migração Prisma `20260627233217_task32_billing_checkout`.
- Rotas privadas de billing foram montadas sob `/api/private/psychologist/*` com `requireRole("psicologo")`; webhook público permanece autenticado por assinatura HMAC do Mercado Pago.
- ADR de implementação criado em `adrs/0173-checkout-assinatura-mercado-pago-preapproval.md`.
- Validações executadas sem erros: `pnpm --dir backend db:migrate -- --name task32_billing_checkout`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`.
- Smoke local HTTP nas rotas principais da UI retornou `307` sem sessão autenticada, compatível com proteção/redirecionamento das rotas privadas.

## Ajuste Mercado Pago com plano em 2026-06-28

- O checkout profissional passou a garantir um plano recorrente real no Mercado Pago antes de criar a assinatura.
- O `subscription_plan.gateway_plan_id` guarda o `preapproval_plan_id` do Mercado Pago; se `MERCADO_PAGO_PREAPPROVAL_PLAN_ID` estiver configurado, ele é importado para o plano interno; se não estiver, o backend cria `/preapproval_plan` uma vez e persiste o id retornado.
- A criação de `/preapproval_plan` exige `MERCADO_PAGO_BACK_URL` público e válido; `localhost` é rejeitado pelo Mercado Pago, então testes locais precisam de domínio/túnel HTTPS ou de um `MERCADO_PAGO_PREAPPROVAL_PLAN_ID` já criado no painel/API.
- A criação da assinatura via `/preapproval` passa a enviar `preapproval_plan_id`, `card_token_id`, `payer_email`, `external_reference` e `status="authorized"`, herdando a recorrência do plano do gateway.
- Logs seguros do adapter foram enriquecidos com operação/status/código quando disponíveis, sem expor access token, public key, webhook secret, PAN, CVV ou token de cartão.

## Correção de homologação em 2026-08-06

- A configuração local que já possuía assinaturas `authorized` foi adotada como baseline, evitando
  novas mudanças por tentativa e erro.
- Desenvolvimento e homologação usam plano associado com Public Key/Access Token `APP_USR-*` da
  aplicação criada dentro de uma conta Mercado Pago vendedora de teste, sem `X-scope: stage`.
- O backend valida em `/users/me` que a credencial sandbox possui a tag `test_user`; token da conta
  real ou credencial `TEST-*` falha antes da criação de recursos.
- O e-mail da conta compradora de teste é obrigatório e idêntico no frontend e no backend.
- O caminho alternativo sem plano e os retries experimentais foram removidos. Uma referência de
  plano só é limpa automaticamente quando o Mercado Pago confirma `404`.
- Decisão e configuração operacional consolidadas em `adrs/0417-restauracao-sandbox-mercado-pago-conta-vendedora-teste.md`.

## Ajuste de mensagens de recusa em 2026-08-13

- Recusas de cartão no checkout e na atualização de método de pagamento passaram a traduzir
  `status_detail`/códigos seguros do Mercado Pago para mensagens públicas em PT-BR.
- Erros esperados de cartão retornam `402` e deixam de aparecer como falha genérica de conexão.
- Configuração/credencial do gateway continua retornando indisponibilidade operacional, sem expor
  detalhes do provedor.
- Logs do gateway registram apenas `status`, `status_detail` e `cause_codes` sanitizados.
- ADR registrado: `adrs/0456-mensagens-publicas-recusa-cartao-mercado-pago.md`.

## Ajuste visual do endereço em 2026-08-13

- A etapa `/app/profissional/assinatura/endereco` deixou de exibir a faixa verde
  "Pagamento bem-sucedido" no formulário de endereço, tanto no mobile quanto no desktop.
- No desktop, o grid do endereço foi reorganizado para manter Número à direita de Logradouro e
  Cidade à direita de Estado, preservando a ordem vertical mobile e os controllers da TASK-02.
- Sem mudança de contrato, banco, gateway ou env; rollback é revert do ajuste visual.
- ADR atualizado: `adrs/0455-autopreenchimento-cep-endereco-assinatura.md`.

## Diagnóstico da troca de conta — 26/10/2026

ADR-0639.

- [x] Não atribuir 4xx desconhecido ao cartão.
- [x] Preservar somente diagnósticos fixos e seguros.
- [x] Validar tipos, build e regressões do backend sobre homolog atualizada.
- [ ] Publicar após hooks e revisão do PR.
- [ ] Confirmar causa do 400 em tentativa real após deploy.

Complemento de diagnóstico: tentativa após 0.1.717 permaneceu com 400 sem detalhe reconhecido. Captura segura agora inclui causas aninhadas e sinais de vocabulário fechado; causa efetiva ainda pendente.

## Complemento em execução — 27/10/2026: correlação e sessão antifraude

ADR-0641. Escopo autorizado: observabilidade sanitizada e sessão opcional do SDK, sem
gerar cobranças de teste, trocar credenciais/API ou alterar dados financeiros existentes.
Consultas somente leitura do incidente distinguiram rejeição de credenciais anterior da
rejeição por risco posterior. O HTTP 400 e os hints isolados não identificam essa causa.

- [x] Capturar a sessão do SDK no submit de checkout/cartão, opcional e sem persistência/log.
- [x] Validar o contrato aditivo e isolar configuração do SDK por operação, inclusive concorrência.
- [x] Correlacionar falha local e fatura notificada com referência opaca e vocabulário fechado.
- [x] Consultar somente GET após webhook autenticado; falha diagnóstica não muda entitlement nem cria retry financeiro.
- [x] Validar testes e checks por aplicação, builds backend/frontend e smoke local sem enviar cartão.
- [x] Passar check integral da raiz (extração mínima de notificações autorizada e validada).
- [x] Versionar, commitar e publicar em homolog, registrar smoke antes da promoção por PR.
- [x] Promover por PR revisado e validar versões e saúde em produção sem realizar cobrança.

Deploy: sem pacote, env ou migration nova; sessão ausente mantém comportamento anterior.
Backend/frontend permanecem independentes; preferir backend primeiro. Rollback por revert,
sem limpeza de dados. Sessão é sinal adicional, não promessa de aprovação. Layout inalterado;
Builder não necessário para alteração de transporte, preservar referências visuais da TASK-32.

Evidência local: backend check com 992 testes aprovados; frontend check, admin check e
video check aprovados (13 testes opcionais de video ignorados pelo próprio runner);
builds backend/frontend aprovados. Prisma gerado e migrations existentes aplicadas somente
a um PostgreSQL efêmero em loopback, sem reset/seeds ou acesso ao banco remoto do `.env`.
`/health`, `/ready`, `/ping` locais HTTP 200; endpoints privados de billing recusam sessão
ausente com 401; browser da rota de cartão redireciona corretamente ao login. Não é uma
validação de aprovação financeira nem um checkout autenticado ponta a ponta.

Bloqueios de publicação em 27/10: `check:source-size` falha no arquivo preexistente
`frontend/src/app/app/notifications/logic.tsx` (622 linhas, teto 600, já presente no HEAD
8846a2944); extração mínima solicitada ao usuário antes de ampliar escopo. A sessão
Vercel disponível só acessa outra equipe, sem Lectum; login na equipe correta solicitado.
Dokploy homolog e produção estão com autodeploy desligado. Homolog backend saudável,
mas ainda em 0.1.617, não valida esta alteração. Nenhuma promoção/deploy foi executada.

Atualização do gate: primeiro push foi bloqueado pelos hooks, sem publicar. Após
autorização explícita, extração mínima na TASK-277 resolveu source-size (588 linhas);
check integral e builds backend/frontend passaram em 0.1.731. Publicação ainda depende
de smoke de homologação da versão nova e acesso à equipe Lectum no Vercel.

Atualização operacional posterior: bloqueios acima resolvidos. PR #133 mesclado como
`ba6c4d60`; backend homolog 0.1.731 com ping/health/ready 200 antes da promoção.
Backend, frontend e admin produtivos verificados em 0.1.731; backend health/ready 200.
Vercel frontend estava Staged por atribuição automática de domínios desativada; promoção
manual concluída e opção reativada depois por autorização explícita. Evidências e limites
do smoke estão nos comentários do PR. Nenhuma cobrança foi efetuada pelo agente.

## Correção em execução — 27/10/2026: sessão com ponto

ADR-0642. Console real do usuário no checkout publicado: SDK carregado, sessão string
com 231 caracteres, ASCII visível e somente `.` fora da allowlist anterior. Não foi
coletado o identificador. Isso comprova omissão pelo helper, não causalidade do HTTP 400.

- [x] Aceitar ponto adicionalmente a letras ASCII, números, hífen e underscore, sem alterar o valor.
- [x] Manter 1–256 caracteres e recusar whitespace, controles, Unicode e coerção em frontend/backend.
- [x] Anunciar `capabilities.device_session_id_dotted=true`; frontend só envia sessão com ponto após esse anúncio, preservando compatibilidade com backend 0.1.731.
- [x] Cobrir helper, validators reais, transporte byte-exato e rollout de versões mistas por testes.
- [x] Validar checks/builds e browser local sem enviar cartão ou simular aprovação financeira.
- [x] Versionar, commitar e publicar em homolog com smoke; promoção produtiva somente via PR revisado.

Sem novo pacote, env, migration ou mudança visual. Reutilizar SDK existente: widget está
presente e define a global; não carregar script antifraude duplicado. Preferir backend antes
do frontend; a capability adicional protege a ordem inversa. Rollback por revert, frontend
primeiro e recarga das abas antes de retornar o backend à validação antiga. Não alterar
credenciais, tipo de API, assinaturas ou dados financeiros; não executar cobrança.

Evidência local 0.1.732: check integral aprovado (995 testes backend; video com 92
aprovados e 13 opcionais ignorados); builds backend/frontend aprovados; 10 testes
focais backend e 9 frontend aprovados; revisão independente sem bloqueantes. Backend
local `/ping`, `/health`, `/ready` HTTP 200 e rota privada sem autenticação 401.
Frontend local `/version` HTTP 200 em 0.1.732; browser da rota pagamento redireciona
ao login preservando callback. QA de guarda de autenticação, não checkout autenticado
ponta a ponta. Execução isolada em loopback, sem credenciais reais de provider ou
acesso ao banco remoto, sem nova migration nem submissão financeira.

Publicação 0.1.732 concluída via PR #134 (merge `509651f27`), após smoke homolog;
backend/frontend/admin em produção verificados na mesma versão, health/ready 200.
Tentativa posterior executada pelo usuário: sessão presente no backend e recusa por
risco confirmada por consultas correlacionadas somente leitura. O agente não cobrou.

## Ajuste em execução — 27/10/2026: mensagem cautelosa e diagnóstico de leitura

ADR-0643. Escopo: cópia segura de checkout/cartão, diagnóstico fechado de consulta de
fatura, análise de alternativas de API e rascunho de chamado. Sem trocar credenciais,
produto financeiro, assinatura, preço, cronograma ou dados de produção.

- [x] Tratar falha indeterminada sem afirmar problema de rede, recusa ou ausência de cobrança.
- [x] Preservar erros de cartão explicitamente classificados e controles de sessão/permissão.
- [x] Diferenciar validação, GET e lookup local em logs sanitizados, com duração e HTTP quando conhecido.
- [x] Manter GET único, timeout de 3s, sem retry financeiro ou mudança de entitlement.
- [x] Validar regressões, checks/builds e browser local, documentando limites do QA sem cobrança.
- [x] Preparar chamado sem PII/segredos e análise fundamentada de Payments/Orders/Assinaturas.
- [x] Versionar e commitar em homolog; informar separadamente publicação e smoke.

Sem env, pacote, schema ou migration nova. Rollout aditivo e independente entre apps;
rollback por revert sem migração de dados. Layout preservado, inclusive mobile-first
~390px; referências da TASK-32 em PROTO-INVENTORY. Builder/Quick Copy indisponível,
usar referência exportada e não redesenhar o checkout. Não usar uma cobrança real
como teste para encerrar esta task.

Evidência local 0.1.733: check integral da raiz e builds backend/frontend aprovados;
revisões independentes de logs e mensagem sem bloqueantes. Backend ping/health/ready
200, billing sem sessão 401; frontend version 200/no-store. Browser local nas duas
rotas valida guarda de autenticação e callback, não checkout autenticado ou toast
pós-submit (sem profissional autenticado local). Cópias e seleção de erro cobertas
por testes unitários reais do helper/código; sem endpoints simulados. Banco local
isolado, sem credenciais de provider nem acesso ao banco remoto. Produção não foi
alterada por esta task; chamado preparado, não enviado.

## Diagnóstico validado localmente — 28/10/2026: saída HTTP da assinatura

ADR-0644. Suporte confirmou recusa de risco, não falha do endpoint. Escopo autorizado:
instrumentação passiva no backend, validação local e commit; sem push/deploy/cobrança.

- [x] Correlacionar cabeçalho final de sessão com a entrada usando apenas booleanos e referência opaca.
- [x] Comparar payload do adapter com e-mail autenticado, distinguindo-o do corpo efetivamente observado.
- [x] Representar explicitamente a ausência de bodyChunkSent no Node 22, sem consumir streams.
- [x] Preservar requisições/resultados, isolar concorrência e limitar/limpar dados transitórios.
- [x] Validar transporte real em loopback Node 22/24, privacidade, limites e falhas; sem simular gateway.
- [x] Executar checks/build backend e smoke local isolado, sem dados ou credenciais produtivas.
- [x] Versionar e commitar em homolog, mantendo publicação pendente de autorização.

Impacto: somente backend; contrato HTTP, UI, banco, pacotes e envs inalterados.
Rollout aditivo independente; rollback por revert sem dados. Não alterar retries,
entitlement, produto/API ou decisões de risco. Evidência de transporte não comprova
ingestão do sinal pelo provider. Sem alteração visual; Builder/proto não se aplicam.

Evidência local 0.1.734: check integral aprovado, incluindo 1.023 testes backend
(todos aprovados; video conserva 13 testes opcionais ignorados). Build backend
aprovado. Suite focal com 20 testes aprovada em Node 24.21.0/Undici 7.29.1 e em
Node 22.23.4/Undici 6.29.1, este em container sem rede externa e montagem somente
leitura. Os testes usam transporte HTTP loopback real, exceto um teste unitário
explicitamente separado para evento malformado do canal; não simulam aprovação.
Revisão independente sem bloqueantes. Smoke local isolado: ping/health/ready 200.

Node 22 confirma cabeçalho final e envio do corpo, mas a identidade do e-mail no
corpo transmitido permanece desconhecida; `payload_payer_email_*` é comparação
no adapter, não evidência de bytes no transporte. Nenhum diagnóstico captura
valores em logs; cenários de logger falhando preservam sucesso e erro originais.
Sem novo pacote/env/migration, UI inalterada. Sem cobrança, acesso ao banco remoto,
push ou deploy. Publicação e observação de tráfego produtivo continuam pendentes
de autorização, sem prometer alteração da recusa de risco.

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

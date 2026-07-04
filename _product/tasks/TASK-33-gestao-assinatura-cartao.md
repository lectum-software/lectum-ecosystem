# TASK-33: Gestão de assinatura e cartão

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-33 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Assinatura |
| Status | Completed |
| Dependências | TASK-02, TASK-32 |
| ADR alvo | ADR de gestão de assinatura e método de pagamento |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Minhas Assinatura - Psicólogo.jpg` | `figma-design-frame-43-Minhas-Assinatura---Psic-logo.html` |
| `_product/proto/Alterar cartão de crédito.jpg` | `figma-design-frame-22-Alterar-cart-o-de-cr-dito.html` |
| `_product/proto/Cartão Alterado com Sucesso.jpg` | `figma-design-frame-56-Cart-o-Alterado-com-Sucesso.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Método de pagamento é dado sensível. O sistema deve delegar cartão ao provedor e só persistir identificadores seguros.

## Objetivo

Permitir que psicólogo veja assinatura atual e altere método de pagamento via gateway real.

## Pré-requisitos e bloqueios

- Provedor **decidido: Mercado Pago** (ADR-0003), via porta `PaymentGateway`/`MercadoPagoAdapter` herdada da TASK-32. Bloqueio restante = **credenciais MP**; sem elas, construir o fluxo mas não transacionar — parar e registrar pendência.
- Alteração de cartão = **re-tokenização de cartão de crédito**: tokenizar o novo cartão de crédito no client (Card Payment Brick) → atualizar o cartão do preapproval via adapter (`updateSubscriptionCard`). Tokens não são portáveis entre gateways (ver `DATA-MODEL.md` › "Abstração de gateway"). Débito e pré-pago ficam fora do MVP.
- Persistir **apenas `gateway_token`** e dados de exibição (`brand`/`last4`/`exp_month`/`exp_year`). **Nunca** armazenar PAN/CVV.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/professional/billing`
- `/app/professional/billing/card`

Implementação esperada:

- Criar tela Minha Assinatura.
- Criar fluxo de alteração de cartão de crédito via provider/checkout seguro.
- Criar confirmação de cartão alterado.
- Exibir plano, status, próxima cobrança e ações permitidas.
- Não coletar número de cartão diretamente se gateway exige componente hospedado; manter o fluxo restrito a cartão de crédito.

## Escopo backend

Implementação esperada:

- Endpoint de assinatura atual.
- Endpoint para iniciar troca de método de pagamento.
- Webhook para confirmar atualização.
- Persistir apenas últimos 4 dígitos/bandeira quando permitido.
- Não cancelar/alterar plano sem confirmação real.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md` › "Assinatura e cobrança"; usar nomes/campos exatos, sem inventar):

- `professional_subscription` (leitura: plano, status, `current_period_end`).
- `payment_method` (`gateway_token` + display only `brand/last4/exp_month/exp_year`; **nunca PAN/CVV**).
- `payment_event` (confirmação via webhook; `@@unique([gateway, external_id])`).

Endpoints esperados:

- GET `/api/private/psychologist/billing/subscription`
- POST `/api/private/psychologist/billing/payment-method/session`
- POST `/api/public/billing/webhook` — mesmo webhook da TASK-32; **validar `x-signature` (HMAC-SHA256) antes de processar**; confirmar atualização de cartão/assinatura e refletir status normalizado.

**Guarda de papel:** as rotas de gestão de assinatura/cartão são exclusivas de psicólogo. Vivem sob `/api/private/psychologist/billing/*` e são protegidas por `requireRole("psicologo")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`, sem `next()`). O escopo de ownership é feito por `req.auth.id`. O webhook `POST /api/public/billing/webhook` **permanece público** (chamado pelo gateway, não autenticado por usuário; autenticidade via verificação de assinatura do provedor). Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

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

Packages permitidos nesta task:

- Gateway escolhido
- TanStack Query
- Prisma

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

## Evid?ncias da execu??o

- Builder Quick Copy n?o estava dispon?vel neste ambiente; foram usadas as imagens locais listadas em "Refer?ncias visuais".
- Mercado Pago sandbox configurado via vari?veis de ambiente locais informadas pelo usu?rio.
- Implementa??o mantida somente para cart?o de cr?dito, sem d?bito/pr?-pago no MVP.
- Migra??o executada: `20260628024244_task33_payment_method`.
- Valida??es executadas sem erros:
  - `pnpm --dir backend exec prisma migrate dev --name task33_payment_method`
  - `pnpm --dir backend db:migrate`
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
- Valida??o visual manual em browser local ficou limitada pela aus?ncia de uma ferramenta de inspe??o visual automatizada neste ambiente; a rota foi validada por build est?tico do Next.js, incluindo `/app/professional/billing` e `/app/professional/billing/card`.

## Ajuste de conversão em 2026-07-04: upgrade direto para cartão

- Pedido direto de produto: ao clicar em **Fazer upgrade** na tela `/app/professional/billing`, o psicólogo deve ir imediatamente para inserir os dados do cartão do Plano Profissional, sem passar pela seleção de plano.
- Referências visuais consultadas: `_product/proto/Minhas Assinatura - Psicólogo.jpg` e `_product/proto/Finalizar Assinatura - Psicólogo.jpg`; Builder/Quick Copy não está exposto como ferramenta direta neste ambiente.
- O CTA fixo da tela de assinatura agora usa `PSYCHOLOGIST_ONBOARDING_PATHS.checkout` e aponta para `/app/professional/billing/checkout`.
- A tela de planos permanece disponível para acessos explícitos, mas deixa de ser etapa intermediária desse CTA de upgrade.
- Nenhum mock, seed, endpoint simulado, package novo ou alteração de schema foi criado.
- ADR registrado: `adrs/0204-upgrade-direto-checkout-profissional.md`.

### Validação do ajuste

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Validação de fonte via PowerShell confirmando o CTA `Fazer upgrade` com `href={PSYCHOLOGIST_ONBOARDING_PATHS.checkout}`.
- Smoke local com `next start --port 3105`: `/app/professional/billing/checkout` retornou `307` para login sem sessão e `/auth/login` retornou `200`.

## Ajuste de UI em 2026-07-04: tela de alteração de cartão mais direta

- Pedido direto de produto: remover da rota `/app/professional/billing/card` a faixa informativa azul com a copy "A Lectum recebe somente o token...", remover o botão **Voltar para assinatura**, remover o botão **Atualizar assinatura** e trocar o texto do botão do Card Payment Brick de **Pagar** para **Alterar cartão**.
- A chamada de alteração de cartão continua usando o Card Payment Brick real do Mercado Pago, restrito a `credit_card`, sem coletar PAN/CVV fora do provedor.
- O ícone do bloco **Novo cartão de crédito** passou a ser `CreditCard`, mantendo `lucide-react` e evitando novo package.
- Referência visual local consultada: `_product/proto/Alterar cartão de crédito.jpg`; Builder/Quick Copy não está exposto como ferramenta direta neste ambiente.
- ADR registrado: `adrs/0208-alterar-cartao-acao-enxuta.md`.

### Validação do ajuste de UI

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke local com `next start --port 3106`: `/app/professional/billing/card` retornou `307` para login sem sessão, preservando a proteção da rota privada; `/auth/login` retornou `200`.


## Ajuste de UI em 2026-07-04: metodo de pagamento e historico

- Pedido direto de produto: na rota `/app/professional/billing`, o bloco do cartao passa a exibir o titulo **Metodo de pagamento** e a descricao segura **Visa final 5682** conforme dados reais de bandeira/ultimos quatro digitos, sem a copy tecnica "Cartao de credito tokenizado...".
- Foram removidos da pagina o card informativo **Cobranca protegida**, o CTA azul **Alterar cartao** e o botao **Atualizar status**; a acao contextual **Alterar** permanece dentro do bloco do metodo quando houver assinatura Mercado Pago gerenciavel.
- A pagina agora exibe **Historico de pagamentos** usando somente eventos reais persistidos em `payment_event` e relacionados por `professional_subscription.id` ou `gateway_subscription_id`; quando nao houver evento real, a UI mostra estado vazio honesto, sem criar entradas ficticias.
- Referencia visual local consultada: `_product/proto/Minhas Assinatura - Psicologo.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente.
- ADR registrado: `adrs/0209-historico-pagamentos-billing-real.md`.

### Validacao do ajuste de UI e historico

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local com `next start --port 3107`: `/app/professional/billing` retornou `307` para `/auth/login?callbackUrl=%2Fapp%2Fprofessional%2Fbilling` sem sessao e `/auth/login` retornou `200`.

## Ajuste em 2026-07-04: cancelamento discreto de assinatura profissional

- Pedido direto de produto: quando o psicólogo possuir Plano Profissional ativo pago via Mercado Pago, a tela `/app/professional/billing` deve exibir uma opção discreta de cancelamento.
- Referência visual local consultada: `_product/proto/Minhas Assinatura - Psicólogo.jpg`, que posiciona **Cancelar Assinatura** como ação secundária no rodapé; Builder/Quick Copy não está exposto como ferramenta direta neste ambiente.
- A ação aparece somente para `source="mercadopago"`, `gateway="mercadopago"`, `status="ativa"`, plano `profissional` e `gateway_subscription_id` real; cortesia administrativa e plano gratuito não exibem cancelamento pelo usuário.
- O backend adicionou `POST /api/private/psychologist/billing/subscription/cancel`, protegido por `requireRole("psicologo")`, e usa a porta `PaymentGateway.cancelSubscription` para cancelar o Preapproval real no Mercado Pago (`status="cancelled"`).
- A assinatura local só muda para `cancelada` após o retorno normalizado do gateway confirmar `cancelada`; sem credenciais/configuração real, a operação retorna erro e não altera o banco.
- ADR registrado: `adrs/0210-cancelamento-assinatura-profissional.md`.

### Critérios de aceite do ajuste

- [x] Referência visual de assinatura foi consultada e a opção inicial permanece discreta/mobile-first.
- [x] A opção só aparece para Plano Profissional ativo pago via Mercado Pago com assinatura externa real.
- [x] O cancelamento aciona o gateway real via porta `PaymentGateway`, sem mock, seed ou endpoint simulado.
- [x] O status local é atualizado para `cancelada` somente após confirmação normalizada do Mercado Pago.
- [x] Feedback de confirmação, estado pendente e erro em PT-BR foram adicionados.
- [x] Nenhum package novo ou alteração de schema foi criado.

### Validação do ajuste de cancelamento

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local com `next start --port 3108`: `/app/professional/billing` retornou `307` para `/auth/login?callbackUrl=%2Fapp%2Fprofessional%2Fbilling` sem sessão e `/auth/login` retornou `200`, preservando a proteção da rota privada.

## Ajuste de UI em 2026-07-04: selo verificado no card do plano

- Pedido direto de produto: substituir o ícone `ShieldCheck` do card principal da rota `/app/professional/billing` pelo selo de verificado usado na Lectum.
- Referência visual local consultada: `_product/proto/Minhas Assinatura - Psicólogo.jpg`; Builder/Quick Copy não está exposto como ferramenta direta neste ambiente.
- A UI agora reutiliza `VerifiedBadgeIcon` de `frontend/src/components/ui/verified-badge.tsx`, sem novo asset, package ou design system paralelo.
- A alteração é somente visual e não muda regra de assinatura, gateway, entitlement ou verificação CFP.
- ADR registrado: `adrs/0211-icone-verificado-assinatura.md`.

### Critérios de aceite do ajuste

- [x] O ícone de shield do card principal foi substituído pelo selo de verificado da Lectum.
- [x] A implementação reutiliza componente existente e mantém abordagem mobile-first da tela.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou alteração de schema foi criado.

### Validação do ajuste de selo verificado

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke local com `next start --port 3109`: `/app/professional/billing` retornou `307` para `/auth/login?callbackUrl=%2Fapp%2Fprofessional%2Fbilling` sem sessão e `/auth/login` retornou `200`, preservando a proteção da rota privada.

## Ajuste de copy em 2026-07-04: cancelamento sem citar fornecedor de pagamento

- Pedido direto de produto: trocar o texto da confirmação de cancelamento para **"Todos os benefícios do Plano Profissional serão desativados após a confirmação."**.
- A experiência de billing deixou de citar o fornecedor de pagamento para o usuário nas telas e mensagens de erro/sucesso relacionadas; o fornecedor permanece apenas como detalhe interno de integração, código e persistência.
- Foram atualizadas copies em `/app/professional/billing`, `/app/professional/billing/card`, `/app/professional/billing/checkout`, `/app/professional/billing/address`, `/app/professional/billing/subscription`, mensagens backend de billing e descrições do histórico de pagamentos.
- Nenhum mock, seed, endpoint simulado, package novo ou alteração de schema foi criado.
- ADR registrado: `adrs/0212-copy-generica-gateway-usuario.md`.

### Critérios de aceite do ajuste

- [x] Texto de cancelamento usa exatamente a copy solicitada.
- [x] Copies visíveis ao usuário em billing não citam o fornecedor de pagamento.
- [x] Mensagens backend de billing que podem chegar ao usuário não citam o fornecedor de pagamento.
- [x] Nenhum contrato técnico, gateway, adapter, assinatura ou regra de cancelamento foi alterado.

### Validação do ajuste de copy

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke local com `next start --port 3113`: `/app/professional/billing` retornou `307` para `/auth/login?callbackUrl=%2Fapp%2Fprofessional%2Fbilling` sem sessão e `/auth/login` retornou `200`.
- Busca de fonte confirmou ausência de `Mercado Pago` nas strings de UI billing e mensagens backend alteradas.

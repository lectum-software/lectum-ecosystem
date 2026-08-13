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

## Evidências da execução

- Builder Quick Copy não estava disponível neste ambiente; foram usadas as imagens locais listadas em "Referências visuais".
- Mercado Pago sandbox configurado via variáveis de ambiente locais informadas pelo usuário.
- Implementação mantida somente para cartão de crédito, sem débito/pr?-pago no MVP.
- Migração executada: `20260628024244_task33_payment_method`.
- Validações executadas sem erros:
  - `pnpm --dir backend exec prisma migrate dev --name task33_payment_method`
  - `pnpm --dir backend db:migrate`
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
- Validação visual manual em browser local ficou limitada pela ausência de uma ferramenta de inspeção visual automatizada neste ambiente; a rota foi validada por build estático do Next.js, incluindo `/app/professional/billing` e `/app/professional/billing/card`.

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

- Pedido direto de produto: na rota `/app/professional/billing`, o bloco do cartao passa a exibir o titulo **Metodo de pagamento** e a descricao segura **Visa final <4 dígitos>** conforme dados reais de bandeira/ultimos quatro digitos, sem a copy tecnica "Cartao de credito tokenizado...".
- Foram removidos da pagina o card informativo **Cobranca protegida**, o CTA azul **Alterar cartao** e o botao **Atualizar status**; a acao contextual **Alterar** permanece dentro do bloco do metodo quando houver assinatura Mercado Pago gerenciavel.
- A pagina agora exibe **Historico de pagamentos** usando somente eventos reais persistidos em `payment_event` e relacionados por `professional_subscription.id` ou `gateway_subscription_id`; quando nao houver evento real, a UI mostra estado vazio honesto, sem criar entradas ficticias.
- Referencia visual local consultada: `_product/proto/Minhas Assinatura - Psicologo.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente.
- ADR registrado: `adrs/0209-historico-pagamentos-billing-real.md`.

### Validacao do ajuste de UI e historico

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Validacao de fonte via PowerShell confirmou o card com
  `href={PSYCHOLOGIST_ONBOARDING_PATHS.checkout}` e o item **Minha Assinatura** preservado em
  `/app/profissional/assinatura`.
- Smoke local com `next start -p 3208`: `/app/perfil` retornou `200` e
  `/app/profissional/assinatura/pagamento` retornou `307` para login sem sessao, preservando a
  protecao da rota privada.
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

## Ajuste em 2026-07-04: cortesia sem cobrança nem cartão legado

- Pedido direto de produto: a conta `<CONTA_DE_TESTE_AUTORIZADA>` está com cortesia operacional, não com assinatura profissional padrão paga.
- A rota `/app/professional/billing` agora diferencia `professional_subscription.source="admin_grant"` ativa, exibindo **Plano Profissional de Cortesia**, **Sem cobrança**, **Expiração da cortesia** e método de pagamento como cortesia sem cartão vinculado.
- O endpoint `GET /api/private/psychologist/billing/subscription` deixou de retornar `payment_method` quando a assinatura atual não é gerenciável por gateway real ativo, evitando exibir cartão tokenizado de assinatura paga cancelada.
- Os alertas de `Pagamento não vinculado` não aparecem para cortesia administrativa, porque ausência de gateway é o estado esperado.
- Referência visual local consultada: `_product/proto/Minhas Assinatura - Psicólogo.jpg`; Builder/Quick Copy não está exposto como ferramenta direta neste ambiente.
- ADR registrado: `adrs/0213-billing-cortesia-sem-cobranca-cartao.md`.
- Nenhum mock, seed, endpoint simulado, package novo ou alteração de schema foi criado.

### Critérios de aceite do ajuste

- [x] Cortesia administrativa ativa aparece explicitamente como cortesia, não como assinatura paga padrão.
- [x] A UI não exibe preço recorrente pago, próxima renovação paga nem cartão legado para cortesia.
- [x] O backend só expõe método de pagamento quando a assinatura atual possui gateway real gerenciável.
- [x] Histórico de pagamentos permanece honesto e usa apenas eventos reais.
- [x] Validação mobile-first/browser local foi executada na rota de billing com sessão real.

### Validação do ajuste de cortesia

- Consulta real da conta confirmou assinatura atual `admin_grant` ativa e retorno do endpoint com `payment_method=null`.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome headless/CDP em `http://localhost:3002/app/professional/billing`, com sessão real da conta, confirmou **Plano Profissional de Cortesia**, **Sem cobrança**, **Expiração da cortesia**, **Cortesia ativa, sem cartão vinculado** e ausência de `Amex final <4 dígitos>`, `Pagamento não vinculado` e `R$ 9,90 / mês`.

## Ajuste de UI em 2026-07-04: cortesia sem historico lateral e com cartao futuro

- Pedido direto de produto: no Plano Profissional de Cortesia, remover o quadrante **Historico de pagamentos** e a faixa azul **Esta conta esta com cortesia profissional ativa...**.
- A rota `/app/professional/billing` agora renderiza a cortesia em coluna unica, sem aside lateral, preservando a composicao mobile-first.
- O campo antes usado como metodo de pagamento da cortesia passou a exibir **Adicionar cartao de cobranca** com a descricao **Cadastre um cartao para a cobranca quando a cortesia chegar ao fim.** e CTA **Adicionar**.
- O CTA de cortesia aponta para a entrada existente `/app/professional/billing/checkout?intent=courtesy-renewal`, sem criar endpoint paralelo, mock, seed, package novo ou alteracao de schema.
- O historico de pagamentos continua disponivel para assinaturas pagas/gerenciaveis e segue usando apenas eventos reais.
- Referencia visual local consultada: `_product/proto/Minhas Assinatura - Psicologo.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente.
- ADR registrado: `adrs/0214-billing-cortesia-cta-cartao-futuro.md`.

### Criterios de aceite do ajuste

- [x] A cortesia administrativa ativa nao exibe o quadrante de historico de pagamentos.
- [x] A cortesia administrativa ativa nao exibe a faixa azul de cortesia ativa.
- [x] O bloco de cartao da cortesia exibe acao de adicionar cartao de cobranca futura.
- [x] Assinaturas pagas continuam com historico e acao de alteracao de cartao quando gerenciaveis.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou alteracao de schema foi criado.

### Validacao do ajuste de cortesia

- `pnpm exec biome check --write src/app/app/professional/billing/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local em `http://localhost:3002/app/professional/billing`, com sessao real da conta em cortesia, confirmou **Adicionar cartao de cobranca**, **Cadastre um cartao para a cobranca quando a cortesia chegar ao fim.**, CTA **Adicionar** e ausencia visual de **Historico de pagamentos**, **Esta conta esta com cortesia profissional ativa**, **Nenhuma cobranca na cortesia** e **Cortesia ativa, sem cartao vinculado**.

## Ajuste em 2026-07-04: cartão futuro antes do endereço na cortesia

- Pedido direto de produto: o CTA **Adicionar cartão de cobrança** da cortesia deve abrir o formulário seguro de cartão de crédito para cobrança futura, e não a página de endereço.
- A rota `/app/professional/billing/checkout?intent=courtesy-renewal` agora bypassa o redirecionamento automático de cortesia ativa para endereço e renderiza o CardPayment Brick com copy de cobrança futura.
- O endpoint `POST /api/private/psychologist/billing/checkout` aceita `intent="courtesy_renewal"` apenas para cortesia administrativa ativa do Plano Profissional com data futura de expiração.
- Ao cadastrar o cartão, o backend cria ou atualiza uma assinatura real no gateway com início previsto na expiração da cortesia e mantém o registro local `inativa` até a cobrança futura.
- Após sucesso no cartão, o backend verifica dados reais de endereço: `billing_address` completo ou endereço profissional completo no perfil. Se não existir, retorna `/app/professional/billing/address?intent=courtesy-renewal`; se existir, retorna `/app/professional/billing`.
- A sync de assinatura preserva `inativa` para preapproval autorizada com `auto_recurring.start_date` futura, evitando ativar cobrança antes do fim da cortesia.
- Referência visual local consultada: `_product/proto/Minhas Assinatura - Psicólogo.jpg`; Builder/Quick Copy não está exposto como ferramenta direta neste ambiente.
- ADR registrado: `adrs/0215-cartao-futuro-cortesia-antes-endereco.md`.
- Nenhum mock, seed, endpoint simulado, package novo ou alteração de schema foi criado.

### Critérios de aceite do ajuste

- [x] O CTA de cortesia abre o checkout de cartão e permanece em `/app/professional/billing/checkout?intent=courtesy-renewal`, sem redirecionar antes para endereço.
- [x] O formulário de cartão usa o CardPayment Brick real e envia `intent="courtesy_renewal"` ao backend.
- [x] O backend só aceita cartão futuro para cortesia profissional ativa com expiração futura.
- [x] Após cartão cadastrado, a decisão de abrir endereço usa dados reais de `billing_address` ou endereço profissional do perfil.
- [x] A assinatura gateway futura fica localmente `inativa` até o `start_date` da cortesia.

### Validação do ajuste de cartão futuro

- `pnpm --dir backend exec biome check --write src/modules/api/private/psychologist/billing/checkout/DTOs/ICheckoutDTO.ts src/modules/api/private/psychologist/billing/checkout/validator/index.ts src/modules/api/private/psychologist/billing/checkout/repositories/CheckoutRepository.ts src/modules/api/private/psychologist/billing/checkout/repositories/interfaces/ICheckoutRepository.ts src/modules/api/private/psychologist/billing/checkout/use-cases/services.ts src/modules/billing/payment-gateway/PaymentGateway.ts src/modules/billing/payment-gateway/MercadoPagoAdapter.ts src/modules/billing/sync-mercado-pago-subscription.ts locales/pt/translation.json`
- `pnpm --dir frontend exec biome check --write src/api/generator/types/billing.ts src/app/app/professional/billing/checkout/logic.tsx`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local mobile-first via Chrome headless/CDP em `http://localhost:3000/app/professional/billing/checkout?intent=courtesy-renewal`, com sessão real da conta em cortesia, confirmou permanência na rota de checkout, título **Adicionar cartão de cobrança**, seção **Cartão de crédito**, campos do CardPayment Brick e ausência de navegação para `/billing/address` antes do cartão.

## Ajuste de copy em 2026-07-04: botão do CardPayment na cortesia

- Pedido direto de produto: trocar o texto do botão do CardPayment Brick no checkout de cortesia de **Pagar** para **Cadastrar cartão**.
- A rota `/app/professional/billing/checkout?intent=courtesy-renewal` agora envia `customization.visual.texts.formSubmit="Cadastrar cartão"` ao Brick, preservando a submissão/tokenização real do cartão.
- O checkout pago padrão mantém o texto **Pagar**.
- Referência técnica consultada: documentação oficial Mercado Pago Card Payment Brick - Change texts (`customization.visual.texts.formSubmit`).
- ADR atualizado: `adrs/0215-cartao-futuro-cortesia-antes-endereco.md`.
- Nenhum mock, seed, endpoint simulado, package novo ou alteração de schema foi criado.

### Critérios de aceite do ajuste

- [x] No checkout de cortesia, o botão final do CardPayment Brick exibe **Cadastrar cartão**.
- [x] O checkout pago padrão não teve regra de pagamento alterada.
- [x] A alteração usa a customização suportada pelo Brick, sem manipulação manual de DOM.

### Validação do ajuste de copy do botão

- `pnpm --dir frontend exec biome check --write src/app/app/professional/billing/checkout/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local mobile-first via Chrome headless/CDP em `http://localhost:3000/app/professional/billing/checkout?intent=courtesy-renewal`, com sessão real da conta em cortesia, confirmou o texto **Cadastrar cartão** no botão do Brick e ausência de **Pagar** na tela.

## Ajuste em 2026-07-04: exibição do cartão futuro cadastrado

- Pedido direto de produto: após cadastrar o cartão da cortesia, a tela **Minha Assinatura** deve informar o cartão cadastrado e transformar a ação **Adicionar** em **Alterar**.
- O checkout de cortesia passou a enviar ao backend os dados seguros de exibição fornecidos pelo CardPayment Brick (`payment_method_id` como `brand` e `lastFourDigits` como `last4`), além do token temporário já usado pelo gateway.
- O backend persiste `brand`/`last4` somente como dados de exibição em `payment_method`, sempre vinculados ao `gateway_subscription_id` da assinatura futura; PAN/CVV continuam fora do banco.
- O endpoint `GET /api/private/psychologist/billing/subscription` continua retornando a cortesia ativa como assinatura principal, mas agora também procura uma assinatura futura real `mercadopago` (`inativa`/`inadimplente`) para expor o `payment_method` correspondente ao cartão pós-cortesia.
- A rota `/app/professional/billing` mostra **Cartão de cobrança cadastrado** e CTA **Alterar** quando esse método futuro existir; se o cartão foi cadastrado antes de haver `brand`/`last4`, mostra **Cartão cadastrado para cobrança futura** sem inventar final/bandeira.
- Consulta real do banco para `<CONTA_DE_TESTE_AUTORIZADA>` durante a validação confirmou que, neste ambiente, ainda não há assinatura futura gateway nem `payment_method` vinculado; por isso não foi criado backfill, seed ou dado artificial para forçar o estado **Alterar**.
- Referência visual local consultada: `_product/proto/Minhas Assinatura - Psicólogo.jpg`; Builder/Quick Copy não está exposto como ferramenta direta neste ambiente.
- ADR atualizado: `adrs/0215-cartao-futuro-cortesia-antes-endereco.md`.
- Nenhum mock, seed, endpoint simulado, package novo ou alteração de schema foi criado.

### Critérios de aceite do ajuste

- [x] O cartão futuro cadastrado é localizado pela assinatura gateway futura, sem substituir a assinatura de cortesia ativa como plano principal.
- [x] Quando houver cartão futuro, a UI muda o bloco para cartão cadastrado e o CTA para **Alterar**.
- [x] Quando não houver cartão futuro real, a UI mantém **Adicionar** sem criar dado artificial.
- [x] O checkout de cortesia persiste apenas dados seguros de exibição (`brand`/`last4`) e nunca PAN/CVV.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou alteração de schema foi criado.

### Validação do ajuste de exibição do cartão futuro

- `pnpm --dir backend exec biome check --write src/modules/api/private/psychologist/billing/checkout/DTOs/ICheckoutDTO.ts src/modules/api/private/psychologist/billing/checkout/validator/index.ts src/modules/api/private/psychologist/billing/checkout/repositories/CheckoutRepository.ts src/modules/api/private/psychologist/billing/checkout/repositories/interfaces/ICheckoutRepository.ts src/modules/api/private/psychologist/billing/checkout/use-cases/services.ts src/modules/api/private/psychologist/billing/subscription/repositories/SubscriptionRepository.ts src/modules/api/private/psychologist/billing/subscription/repositories/interfaces/ISubscriptionRepository.ts src/modules/api/private/psychologist/billing/subscription/use-cases/services.ts locales/pt/translation.json`
- `pnpm --dir frontend exec biome check --write src/api/generator/types/billing.ts src/app/app/professional/billing/logic.tsx src/app/app/professional/billing/checkout/logic.tsx`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local mobile-first via Chrome headless/CDP em `http://localhost:3115/app/professional/billing`, com frontend apontando para backend local `http://localhost:3121` e sessão real da conta em cortesia, confirmou **Minha Assinatura**, **Plano Profissional de Cortesia**, **Adicionar cartão de cobrança**, **Cadastre um cartão para a cobrança quando a cortesia chegar ao fim.**, CTA **Adicionar** e ausência de **Histórico de pagamentos** e da faixa azul de cortesia. O estado **Alterar** não foi forçado porque a base real não possuía cartão futuro cadastrado.

## Ajuste em 2026-07-05: cartão de teste sem `gateway_token` exposto

- Pedido direto de produto: após cadastrar cartão de teste Mercado Pago, a tela **Minha Assinatura** ainda mostrava **Adicionar cartão de cobrança**.
- Investigação real confirmou que o banco já possuía assinatura futura `mercadopago` `inativa` e `payment_method` com `brand="amex"` e `last4="<FINAL_AUTORIZADO>"` para a conta `<CONTA_DE_TESTE_AUTORIZADA>`.
- O endpoint `GET /api/private/psychologist/billing/subscription` já retornava `payment_method` com bandeira/final, mas não expunha `gateway_token` no payload consumido pelo frontend; a UI dependia indevidamente de `paymentMethod.gateway_token` para considerar o cartão cadastrado.
- A rota `/app/professional/billing` agora usa a presença do objeto `payment_method` como evidência de cartão futuro cadastrado, porque o backend já filtrou esse método pela assinatura gateway futura antes de responder.
- Resultado esperado no teste: exibir **Cartão de cobrança cadastrado**, **Amex final <4 dígitos>** e CTA **Alterar**.
- ADR atualizado: `adrs/0215-cartao-futuro-cortesia-antes-endereco.md`.
- Nenhum mock, seed, endpoint simulado, package novo ou alteração de schema foi criado.

### Critérios de aceite do ajuste

- [x] A UI não depende de `gateway_token` exposto para reconhecer cartão futuro.
- [x] Quando o endpoint retorna `payment_method`, a cortesia mostra cartão cadastrado e CTA **Alterar**.
- [x] O backend continua sendo a fronteira que decide se o `payment_method` é seguro/pertinente para a assinatura futura.

### Validação do ajuste de cartão de teste

- Consulta real de banco confirmou assinatura futura `mercadopago` `inativa` e `payment_method` com `brand`/`last4`.
- Chamada real ao endpoint via ngrok confirmou `payment_method_present=true`, `brand="amex"` e `last4="<FINAL_AUTORIZADO>"`.
- `pnpm --dir frontend exec biome check --write src/app/app/professional/billing/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local mobile-first via Chrome headless/CDP em `http://localhost:3115/app/professional/billing`, com frontend apontando para backend local `http://localhost:3121` e sessão real da conta em cortesia, confirmou **Plano Profissional de Cortesia**, **Amex final <4 dígitos>**, CTA **Alterar**, ausência de CTA **Adicionar**, ausência de **Histórico de pagamentos** e ausência da faixa azul de cortesia.


## Correcao em 2026-08-10: alias sanitizado em Minha Assinatura

- Incidente observado em homologacao: psicologo com cortesia administrativa ativa no Admin (`Plano = Cortesia`) via a tela `/app/profissional/assinatura` como `Plano nao encontrado`, status `Pendente` e `R$ 0,00 / mes`.
- Causa tecnica: o endpoint `GET /api/private/psychologist/billing/subscription` mantem, por compatibilidade, os campos `current` e `subscription` com a mesma assinatura. A camada `send` passava o payload por sanitizadores com `WeakSet` global; o segundo alias era tratado como ciclo e redigido, entao o frontend priorizava `subscription` invalido em vez de `current` completo.
- Ajuste: `sanitizeSensitiveData` e `sanitizePublicResponseData` agora rastreiam apenas a pilha de recursao atual, preservando aliases legitimos e mantendo ciclos reais como `[REDACTED]`.
- Nenhum package novo, migration, seed, mock, env nova ou alteracao de contrato foi criado.
- ADR registrado: `adrs/0446-sanitizacao-aliases-resposta-billing.md`.
- Validacoes executadas sem erros:
  - `pnpm --dir backend exec node --import tsx --test src/utils/sanitize-sensitive.test.ts src/utils/public-response.test.ts`
  - Simulacao local do pipeline confirmando `current` e `subscription` completos para assinatura `admin_grant/ativa/profissional`
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm check:version`
  - `pnpm check`

## Ajuste de UI em 2026-08-10: voltar no checkout de cartao futuro

- Pedido direto de produto: na tela mobile de **Adicionar cartao de cobranca** (`/app/profissional/assinatura/pagamento?intent=courtesy-renewal`), incluir uma seta de voltar no topo esquerdo.
- A rota de checkout agora exibe um botao circular com `ArrowLeft`, alinhado ao topo esquerdo do container mobile-first, antes do bloco central de titulo.
- A acao aponta para `/app/profissional/assinatura`, retornando para **Minha Assinatura** sem depender do historico do navegador.
- Referencias visuais consultadas: screenshot enviada pelo usuario em 2026-08-10 e `_product/proto/Finalizar Assinatura - Psicologo.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente.
- Nenhum mock, seed, endpoint simulado, package novo, env nova, migration ou alteracao de contrato foi criado.
- ADR atualizado: `adrs/0215-cartao-futuro-cortesia-antes-endereco.md`.

### Criterios de aceite do ajuste

- [x] A tela de checkout de cartao futuro exibe seta de voltar no topo esquerdo.
- [x] A seta retorna para **Minha Assinatura** por rota interna segura.
- [x] A composicao mobile-first da tela e o CardPayment Brick real foram preservados.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou alteracao de schema foi criado.

### Validacao do ajuste de voltar

- `pnpm --dir frontend exec biome check --write src/app/app/professional/billing/checkout/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check:version`
- `pnpm check`

## Correção em 2026-08-13: campos do CardPayment visíveis no pagamento profissional

- Incidente observado em homologação/iPhone: a tela `/app/profissional/assinatura/pagamento`
  exibia o resumo **Cartão de crédito**, mas o campo seguro de cartão ficava ausente abaixo do bloco.
- Causa técnica provável: a CSP do frontend permitia o SDK principal do Mercado Pago, porém não
  contemplava todos os assets dinâmicos usados pelo Card Payment Brick em runtime. Quando o carregamento
  externo falhava, o componente React do provider mantinha o container vazio, sem feedback visual para o
  usuário.
- Ajuste: `frontend/next.config.ts` passou a centralizar as fontes CSP do Mercado Pago, incluindo os
  assets estáticos do Brick em `https://http2.mlstatic.com` e `https://api-static.mercadopago.com` nas
  diretivas necessárias. A tela de checkout
  também ganhou estado explícito de carregamento, timeout honesto e ação **Tentar novamente** para o
  CardPayment, preservando a tokenização real do provider e sem coletar PAN/CVV na Lectum.
- Referência visual local consultada: `_product/proto/Finalizar Assinatura - Psicólogo.jpg`; Builder
  Quick Copy não está exposto como ferramenta direta neste ambiente.
- Nenhum mock, seed, endpoint simulado, package novo, env nova, migration ou alteração de contrato foi
  criado.
- ADR registrado: `adrs/0454-csp-mercado-pago-cardpayment-checkout.md`.

### Critérios de aceite da correção

- [x] A tela de pagamento do Plano Profissional continua usando o Card Payment Brick real do Mercado Pago.
- [x] A CSP do frontend permite os assets necessários para o Brick montar os campos seguros do cartão.
- [x] Se o carregamento externo falhar, a UI deixa de ficar em branco e mostra feedback com ação de retry.
- [x] A regra de crédito recorrente, tokenização no provider e ausência de PAN/CVV no frontend/backend foram
  preservadas.

### Validação da correção do CardPayment

- `pnpm --dir frontend exec biome check --write next.config.ts src/app/app/professional/billing/checkout/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke local com `next start --port 3118` antes do bump de release: `/version` retornou `0.1.91`; `/app/profissional/assinatura/pagamento` retornou `307` para login sem sessão e a CSP enviada continha `sdk.mercadopago.com`, `http2.mlstatic.com`, `api-static.mercadopago.com` e domínios Mercado Pago necessários ao Brick.
- `pnpm check`
- `pnpm check:version` após `pnpm version:bump`, confirmando manifests sincronizados em `0.1.92`.
## Correcao em 2026-08-13: paridade site/PWA no Plano Gratuito

- Incidente observado em homologacao/iPhone: em `/app/profissional/assinatura` no Safari, psicologo gratuito podia ver o estado **Assinatura nao encontrada**, enquanto o PWA exibia a tela persuasiva de **Plano Gratuito** com CTA **Fazer upgrade**.
- Ajuste: a rota principal de **Minha Assinatura** passa a reutilizar a mesma view gratuita quando a API retorna assinatura gratuita ou quando nao ha assinatura vigente, evitando o empty state antigo no fluxo gratuito.
- A view compartilhada agora trata ausencia de assinatura como fallback visual de Plano Gratuito, sem criar mock, seed, dado fake, env nova, package novo, migration ou alteracao de contrato.
- A gestao paga/cortesia permanece inalterada quando existe assinatura profissional/cortesia real.
- ADR atualizado: `adrs/0183-prioridade-plano-gratuito-billing.md`.

### Criterios de aceite da correcao

- [x] `/app/profissional/assinatura` nao exibe **Assinatura nao encontrada** para psicologo gratuito/sem assinatura vigente.
- [x] O site e o PWA reutilizam a mesma tela de **Plano Gratuito** com beneficios e CTA **Fazer upgrade**.
- [x] Assinaturas profissionais/cortesias reais continuam seguindo a tela de gestao atual.

### Validacao da correcao site/PWA

- `pnpm --dir frontend exec biome check --write src/app/app/professional/billing/logic.tsx src/app/app/professional/billing/subscription/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`

## Correcao em 2026-08-13: plano efetivo gratuito apos assinatura declinada

- Incidente observado em homologacao/Android: uma tentativa de assinatura profissional encerrada
  aparecia em **Minha Assinatura** como **Plano Profissional** com status **Cancelado**, mesmo sem
  pagamento confirmado ou cartao cadastrado.
- Ajuste: os endpoints de plano atual deixam de usar a ultima assinatura encerrada como fallback.
  Agora o contrato expõe apenas profissional ativo, profissional `inativa` ainda com referencia real
  aguardando confirmacao ou plano gratuito ativo; sem esses estados, retorna `null` e a UI reutiliza
  a experiencia de **Plano Gratuito**.
- Assinaturas `cancelada` ou `inadimplente` continuam preservadas no banco/historico operacional,
  mas deixam de ser o plano principal exibido ao psicologo.
- Nenhum mock, seed, endpoint simulado, package novo, env nova, migration ou mutacao automatica de
  dados publicados foi criada.
- ADR registrado: `adrs/0457-plano-efetivo-gratuito-apos-assinatura-declinada.md`.

### Criterios de aceite da correcao

- [x] Assinatura profissional cancelada nao aparece como plano atual do psicologo.
- [x] Ausencia de assinatura vigente cai na tela de **Plano Gratuito** com CTA de upgrade.
- [x] Assinatura profissional `inativa` com referencia real ainda pode aparecer como aguardando
  confirmacao.
- [x] Nenhum dado real de assinatura foi resetado, apagado ou reclassificado em massa.

### Validacao da correcao de plano efetivo

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`

## Ajuste em 2026-08-13: upgrade do perfil direto para pagamento

- Pedido direto de produto: no perfil privado do psicologo, o card azul **Upgrade para o Plano
  Profissional** deve levar diretamente para a tela de pagamento/cartao, em vez de abrir **Minha
  Assinatura**.
- Ajuste: o card de upgrade em `/app/perfil` passa a usar `PSYCHOLOGIST_ONBOARDING_PATHS.checkout`,
  apontando para `/app/profissional/assinatura/pagamento`.
- A decisao reaproveita o fluxo ja aprovado no ADR-0204 para upgrade direto ao checkout e preserva a
  tela **Minha Assinatura** apenas para o menu explicito da conta.
- Nenhum mock, seed, endpoint simulado, package novo, env nova, migration ou mutacao de dados foi
  criada.
- Referencia visual ativa: captura enviada pelo usuario em 2026-08-13; Builder/Quick Copy nao esta
  exposto como ferramenta direta neste ambiente.
- ADR atualizado: `adrs/0204-upgrade-direto-checkout-profissional.md`.

### Criterios de aceite do ajuste do perfil

- [x] O card azul **Upgrade para o Plano Profissional** do perfil aponta para
  `/app/profissional/assinatura/pagamento`.
- [x] O item **Minha Assinatura** do menu da conta continua apontando para
  `/app/profissional/assinatura`.
- [x] O ajuste reutiliza a constante compartilhada do fluxo de onboarding/assinatura, sem rota
  hardcoded nova.

### Validacao do ajuste do perfil

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`

## Ajuste em 2026-08-13: localidade do endereco de faturamento

- Pedido direto de produto: na etapa `/app/profissional/assinatura/endereco`, trocar a copy
  introdutoria para **Informe seu endereco comercial para faturamento.**, fazer **Estado** e
  **Cidade** funcionarem como na edicao do perfil do psicologo e mover a seta do botao para a
  direita do texto **Salvar e continuar**.
- Ajuste: o formulario de faturamento passa a reutilizar `STATE_OPTIONS` e
  `CITY_OPTIONS_BY_STATE`, exigindo primeiro a selecao do estado e depois a cidade em dropdown
  filtravel.
- O autopreenchimento por CEP continua silencioso em caso de falha, mas agora aplica UF antes da
  cidade para respeitar a dependencia entre os campos; se o estado for trocado manualmente, cidade
  incompatível e limpa.
- Nenhum mock, seed, endpoint simulado, package novo, env nova, migration ou mutacao de dados foi
  criada.
- Referencia visual ativa: capturas enviadas pelo usuario em 2026-08-13; Builder/Quick Copy nao
  esta exposto como ferramenta direta neste ambiente.
- ADR atualizado: `adrs/0455-autopreenchimento-cep-endereco-assinatura.md`.

### Criterios de aceite do ajuste de localidade

- [x] A copy da tela usa **Informe seu endereco comercial para faturamento.**
- [x] O campo **Estado** aparece antes de **Cidade** e usa dropdown filtravel.
- [x] O campo **Cidade** fica dependente do Estado e usa dropdown filtravel com as cidades do UF
  selecionado.
- [x] O autopreenchimento por CEP preenche UF/cidade quando encontrados, sem exibir erro quando nao
  encontrar.
- [x] O botao **Salvar e continuar** exibe a seta a direita do texto.

### Validacao do ajuste de localidade

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Validacao de fonte confirmou Estado antes de Cidade, cidade dependente de `state`, uso de
  `CITY_OPTIONS_BY_STATE` e seta depois do texto do botao.
- Smoke local com `next start -p 3211`: `/app/profissional/assinatura/endereco` retornou `307`
  para login sem sessao e `/app/professional/billing/address` retornou `308` para a rota PT-BR.
- `pnpm check`

## Ajuste em 2026-08-13: badge de pagamento aprovado no checkout

- Pedido direto de produto: na pagina de inserir dados do cartao
  (`/app/profissional/assinatura/pagamento`), apos a aprovacao do pagamento, exibir um badge verde
  **Pagamento bem-sucedido**.
- Ajuste: o checkout passa a reconhecer status de gateway aprovados (`authorized`, `approved` e
  `accredited`) ou a assinatura profissional ativa apos sincronizacao para exibir o badge. Enquanto
  o redirecionamento para o endereco acontece, o badge permanece visivel por um curto intervalo para
  confirmar a aprovacao ao usuario.
- O Card Payment Brick real segue sendo a unica entrada de dados de cartao. Quando o pagamento ja
  foi aprovado no fluxo atual, o formulario nao e reapresentado no mesmo estado de sucesso.
- Nenhum mock, seed, endpoint simulado, package novo, env nova, migration, mutacao de dados ou
  alteracao de contrato foi criada.
- Referencia visual ativa: pedido direto do usuario em 2026-08-13 e padrao de badge ja usado na
  etapa de endereco; Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente.
- ADR atualizado: `adrs/0204-upgrade-direto-checkout-profissional.md`.

### Criterios de aceite do ajuste de badge

- [x] A tela de pagamento/cartao exibe o badge verde **Pagamento bem-sucedido** apos aprovacao.
- [x] O badge tambem aparece durante o estado de redirecionamento para a etapa de endereco.
- [x] O fluxo continua usando o Card Payment Brick real, sem coletar PAN/CVV na Lectum.

### Validacao do ajuste de badge

- Validacao de fonte confirmou `PaymentSuccessBadge`, uso dos status aprovados e exibicao do badge
  antes do redirecionamento para endereco.
- `pnpm --dir frontend exec biome check --write src/app/app/professional/billing/checkout/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke local com `next start -p 3212`: `/version` retornou `200`,
  `/app/profissional/assinatura/pagamento` retornou `307` para login sem sessao e
  `/app/professional/billing/checkout` retornou `308` para a rota PT-BR.
- `pnpm check`

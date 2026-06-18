# TASK-31: Planos de assinatura

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-31 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Assinatura |
| Status | Completed |
| Dependências | TASK-03, TASK-18 |
| ADR alvo | ADR de planos profissionais |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Planos de Assinatura.jpg` | `figma-design-frame-5-Planos-de-Assinatura.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Planos aparecem antes do checkout. A task pode listar planos e benefícios, mas compra real depende da decisão de gateway.

## Objetivo

Exibir planos profissionais reais e preparar upgrade sem escolher gateway no código.

## Pré-requisitos e bloqueios

- Provedor **decidido: Mercado Pago** (ADR-0003). Esta task de planos é **listagem read-only** de planos e da assinatura atual de qualquer forma (a compra real é a TASK-32); não faz chamada de cobrança. Não depende de credenciais MP.
- Preço do Plano Profissional = `990` centavos (R$ 9,90/mês, PRD §13), em `subscription_plan.price_cents`; preço final confirmado em TASK-03. Não hardcodar preço fora desse modelo.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/professional/billing/plans`

Implementação esperada:

- Criar tela de planos com plano atual e CTAs.
- Buscar planos do backend/config real.
- Destacar limitações do plano atual.
- Se credenciais/ambiente Mercado Pago estiverem ausentes, CTA deve registrar bloqueio/pendência e não simular checkout.
- Não hardcodar preço fora de fonte definida.

## Escopo backend

Implementação esperada:

- Modelar `subscription_plan` conforme `DATA-MODEL.md` (não inventar fonte alternativa).
- Endpoint de listagem de planos e assinatura atual.
- Não aceitar plano atual vindo do frontend.
- Registrar regra de features por plano.
- Preparar contrato para checkout da TASK-32.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md` › "Assinatura e cobrança"; usar nomes/campos exatos, sem inventar):

- `subscription_plan` (read-only: `slug` `"gratuito"|"profissional"`, `price_cents` = `990` no profissional, `features Json`, `active`).
- `professional_subscription` (status atual da assinatura do psicólogo; somente leitura nesta task).

Endpoints esperados (autogestão do psicólogo; assinatura/billing sob `/api/private/psychologist/billing/*`):

- GET `/api/private/psychologist/billing/plans` — listagem; se vier muitos itens, aplicar paginação do "Contrato padrão de API" (`page`/`limit`).
- GET `/api/private/psychologist/billing/current`

**Guarda de papel:** estes endpoints são exclusivos de psicólogo. Vivem sob `/api/private/psychologist/*` (billing/assinatura sob `/api/private/psychologist/billing/*`) e são protegidos por `requireRole("psicologo")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`, sem `next()`). O escopo de ownership é feito por `req.auth.id`. Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

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

- TanStack Query
- Prisma
- stripe/mercadopago/asaas candidatos condicionais

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
- [x] Rotas sob `/api/private/psychologist/*` exigem `requireRole("psicologo")` (fail-closed), conforme ADR-0002.
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

## Execucao TASK-31

- Referencia visual consultada pela imagem local `_product/proto/Planos de Assinatura.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente.
- Implementada rota mobile-first `/app/professional/billing/plans` com `page.tsx` e `logic.tsx`, reutilizando `PrivateTemplate`, componentes UI existentes, TanStack Query e textos em PT-BR.
- O cadastro do psicologo agora usa `USER_HOME_PATHS.psicologo = "/app/professional/billing/plans"`; Google vai direto para planos quando a conta volta confirmada, e e-mail/senha continua passando por `/auth/verify-email` antes de planos.
- Criados modelos `subscription_plan` e `professional_subscription` conforme `DATA-MODEL.md` > "Assinatura e cobranca".
- Criada migration `20260605120000_add_subscription_plans` com os planos reais `gratuito` e `profissional`; preco do profissional fica persistido em `subscription_plan.price_cents = 990` e o frontend apenas formata esse valor.
- Criados endpoints `GET /api/private/psychologist/billing/plans` e `GET /api/private/psychologist/billing/current`, ambos montados com `_auth` e `requireRole("psicologo")` em `write.ts`.
- CTA do plano profissional nao simula checkout: enquanto a TASK-32 nao existir com credenciais reais do Mercado Pago, exibe pendencia via feedback visual e nao cria assinatura nem cobranca.
- Plano gratuito encaminha para a etapa atual `/psychologist/cfp`, sem persistir assinatura fake.
- ADR criado: `adrs/0016-planos-apos-cadastro-psicologo.md`.

## Validacao executada

- `pnpm --dir backend db:migrate` (primeira tentativa falhou por BOM na migration SQL; arquivo corrigido para UTF-8 sem BOM e segunda tentativa aplicada com sucesso).
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local com `next start --port 3012`: `curl` em `/app/professional/billing/plans` com cookie de sessao de smoke retornou HTTP 200.

## Pendencias

- Checkout real do Plano Profissional permanece na TASK-32 e depende de credenciais reais do Mercado Pago; nenhum pagamento ou ativacao de assinatura foi simulado.
- A etapa CFP/CRP continua com as pendencias ja registradas em TASK-10/TASK-11.

## Ajuste visual solicitado em 2026-06-05: tela sem cabeçalho e sem aviso de pagamento

- Pedido direto de produto: remover o cabeçalho privado da página de planos e remover o
  bloco informativo `Pagamento seguro` do rodapé da listagem.
- `PrivateTemplate` passou a aceitar `showHeader={false}`, mantendo `NotificationManager`
  e o `PageShell` sem criar template paralelo.
- `/app/professional/billing/plans` usa o template sem cabeçalho e continua consumindo os
  endpoints reais de planos/assinatura atual.
- O aviso `Pagamento seguro`, `Cartão via Mercado Pago` e `Sem simular cobrança` foi
  removido apenas da UI; a regra de não simular checkout permanece no CTA do plano
  profissional.

### Validação do ajuste

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm check`
- Browser local em `/app/professional/billing/plans`, com usuário psicólogo temporário
  criado por endpoint real, validou `headerCount=0` e ausência dos textos `Dashboard`,
  `Sair`, `Pagamento seguro`, `Cartão via Mercado Pago` e `Sem simular cobrança`.
- O usuário temporário da validação foi removido do banco ao final.

## Execucao complementar em 2026-06-07

- O CTA do Plano Gratuito deixou de mandar direto para CFP e agora persiste a escolha real por `POST /api/private/psychologist/billing/select-free`.
- A assinatura gratuita usa `professional_subscription` com plano `gratuito`, status `ativa` e sem gateway.
- Depois da escolha gratuita, a UI segue para `/app/professional/whatsapp/verify` e, ap?s salvar o WhatsApp, para `/app/professional/profile/setup`, sem validar CRP pela API no plano gratuito.
- O CTA do Plano Profissional segue para `/app/professional/billing/checkout`, que permanece bloqueado ate a TASK-32 ter Mercado Pago real.

## Ajuste de jornada em 2026-06-07: sem navega��o privada e endere�o p�s-pagamento

- Pedido direto de produto: remover a navega��o inferior das telas a partir de planos no onboarding do psic�logo.
- `PrivateTemplate` passou a tratar `showHeader={false}` como fluxo sem navega��o inferior, preservando o shell privado e sem criar template paralelo.
- Telas cobertas pelo ajuste: `/app/professional/billing/plans`, `/app/professional/billing/checkout`, `/app/professional/billing/address`, `/app/professional/whatsapp/verify` e `/app/professional/profile/setup`.
- A jornada paga foi reordenada para: plano -> pagamento real confirmado -> endere�o de faturamento -> telefone -> CRP -> perfil.
- A jornada gratuita permanece: plano gratuito persistido -> WhatsApp -> perfil, sem cobran�a simulada.

## Atualizacao em 2026-06-07: gratuito com WhatsApp e sem CRP API

- O plano gratuito passa pela insercao do WhatsApp, mas nao pela validacao CFP/CRP por API antes da configuracao do perfil.
- A selecao do plano gratuito segue para `/app/professional/whatsapp/verify`; a confirmacao de WhatsApp salvo segue para `/app/professional/profile/setup`.
- A API CFP/CRP continua reservada aos fluxos que exigirem verificacao real, sem mock ou preenchimento artificial de cfp_verified_at.

## Ajuste de conversao em 2026-06-18: planos orientados a beneficios

- Pedido direto de produto: tornar a tela `/app/professional/billing/plans` mais voltada a beneficios reais, autoridade, reputacao e conversao do psicologo.
- Referencia visual ativa continua sendo a imagem local `_product/proto/Planos de Assinatura.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente.
- Removido da UI o bloco tecnico que explicava as jornadas `Gratuito: plano -> WhatsApp -> perfil` e `Assinatura: plano -> pagamento -> confirmacao -> endereco -> telefone -> CRP -> perfil`.
- A descricao passou a usar a proposta de valor: `Mais visibilidade. Mais autoridade. Mais oportunidades.` e o texto explicativo solicitado pelo produto.
- O preco continua vindo de `subscription_plan.price_cents`; apenas a formatacao da UI foi ajustada para exibir centavos, garantindo `R$ 9,90` no Plano Profissional.
- Beneficios dos planos foram reorganizados conforme a estrategia comercial atual:
  - Plano Gratuito destaca presenca inicial, WhatsApp, ate 3 especialidades e 1 servico profissional.
  - Plano Profissional destaca verificacao, avaliacoes, prioridade na busca, respostas destacadas, elegibilidade ao Top Mentor, ate 10 especialidades, servicos ilimitados, estatisticas e suporte prioritario.
- Removida a mencao a video de apresentacao no perfil dos beneficios da tela.
- Nenhuma regra de checkout, assinatura, gateway, persistencia de plano ou endpoint foi alterada neste ajuste visual/copy.

### Validacao do ajuste

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local em `/app/professional/billing/plans` com sessao real de psicologo validou a presenca da nova proposta de valor, `R$ 9,90`, beneficios solicitados e ausencia do bloco tecnico e dos textos removidos.


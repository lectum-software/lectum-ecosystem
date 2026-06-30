# TASK-34: Qualidade, segurança, LGPD e operação

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-34 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Qualidade |
| Status | Completed |
| Dependências | TASK-13 a TASK-33 |
| ADR alvo | ADR de hardening operacional |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

Sem tela específica. Esta task usa todas as rotas principais como referência de validação.

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Depois das jornadas principais, o projeto precisa sair do modo implementação de tela e entrar em revisão operacional. Esta task não substitui testes das tasks anteriores; ela fecha lacunas transversais.

## Objetivo

Fazer varredura final de qualidade, segurança, acessibilidade, LGPD mínima e operação do produto.

## Pré-requisitos e bloqueios

- Se testes automatizados forem incluídos, packages devem estar autorizados em `PACKAGES.md` e ADR.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `todas as rotas principais`

Implementação esperada:

- Validar rotas principais em desktop/mobile.
- Revisar acessibilidade de botões, labels, foco, contraste e navegação por teclado.
- Revisar estados loading/erro/vazio/sucesso em todas as telas.
- Remover código morto, estilos duplicados e dependências visuais temporárias.
- Garantir que nenhum dado fake restou no frontend.

## Escopo backend

Implementação esperada (itens objetivos e verificáveis):

- Revisar autenticação/autorização de rotas privadas (headers `Authorization: Bearer <jwt>` + `x-device`; `req.auth`), sem recriar autenticação.
- Auditar a guarda de papel (ver `DATA-MODEL.md`, "Camadas de autenticação e autorização", e `adrs/0002-arquitetura-auth-roles.md`): toda rota sob `/api/private/psychologist/*` tem `requireRole("psicologo")` e toda rota sob `/api/private/patient/*` tem `requireRole("paciente")`, fail-closed; o check de boot está ativo; descoberta de psicólogos está em `/api/private/directory/*` (neutra), não confundida com autogestão. Confirmar ownership scoping por `req.auth.id` nessas rotas.
- Confirmar que **todos os índices `@@index`/`@@unique` nomeados no `DATA-MODEL.md`** existem no `schema.prisma` (ex.: `notification` `@@index([user_id, read_at, createdAt])`, `payment_event` `@@unique([gateway, external_id])`, `professional_subscription` `@@index([psychologist_id, status])`).
- Confirmar que toda query de produto **respeita o soft delete** (`deleted=false`) e nunca apaga fisicamente registros.
- Confirmar que listagens usam a paginação do "Contrato padrão de API" (`page`/`limit`, default 20, máx 50).
- Revisar validação de payloads via `validator/index.ts` e traduções PT-BR em `backend/locales/pt/translation.json`.
- Revisar logs sem dados sensíveis; auditoria de ações relevantes via modelo existente `log__user` (não criar tabela de auditoria paralela).

Campos sensíveis (LGPD) que exigem tratamento explícito (manuseio mínimo, sem log em claro, exclusão/anonimização documentada):

- `psychologist_profile.cpf`
- `psychologist_profile.whatsapp`
- `billing_address` (endereço completo)
- `payment_method` (apenas `gateway_token` + display; **nunca** PAN/CVV)

Modelos/tabelas envolvidos:

- Todos os modelos criados nas tasks anteriores, conforme `DATA-MODEL.md` (sem inventar schema novo nesta task).

Endpoints esperados:

- Todas as rotas públicas e privadas principais.

Pacotes de teste (`Vitest`/`Playwright`/`supertest`) permanecem **candidatos**. Sentry foi decidido na TASK-03 / ADR-0006, mas deve ser instalado apenas nesta task ou em task dedicada de observabilidade.

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

- Vitest candidato
- Playwright candidato
- supertest candidato
- Sentry decidido na TASK-03 / ADR-0006; instalar/configurar somente nesta task ou em task dedicada

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

- [x] Rotas privadas principais foram revisadas quanto a autenticação/autorização (Bearer + `x-device`), sem autenticação paralela.
- [x] Guarda de papel auditada: rotas `/psychologist/*` e `/patient/*` com `requireRole` fail-closed, check de boot ativo e smoke test (paciente → `403` em rota psicólogo-only e vice-versa) passando; descoberta em `/directory/*`.
- [x] Estados loading/erro/vazio/sucesso revisados nas rotas principais, em PT-BR, desktop e mobile.
- [x] Índices `@@index`/`@@unique` nomeados no `DATA-MODEL.md` conferidos no `schema.prisma`; exceção documentada: `professional_document @@index([psychologist_id, type])` permanece fora do schema enquanto a `TASK-11`/ADR-0017 bloquear storage privado de CRP.
- [x] Soft delete (`deleted=false`) respeitado em todas as queries de produto; sem exclusão física.
- [x] Listagens usam a paginação do "Contrato padrão de API" (`page`/`limit`).
- [x] Campos LGPD-sensíveis (`psychologist_profile.cpf`, `whatsapp`, `billing_address`, `payment_method`) com manuseio documentado e fora dos logs; `payment_method` sem PAN/CVV.
- [x] Auditoria de ações relevantes via `log__user` existente; sem tabela de auditoria paralela.
- [x] Logs revisados sem dados sensíveis em claro.
- [x] Fluxos LGPD mínimos (consentimento, exclusão/anonimização, privacidade) documentados.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado restou.
- [x] Packages de teste continuam candidatos; nenhum instalado sem consulta a `PACKAGES.md` + ADR. Sentry, embora decidido, só foi instalado/configurado nesta task ou em task dedicada.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
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

## Execução 2026-06-29 — bloqueada por dependências finais (histórico)

A execução foi interrompida antes de qualquer implementação de hardening porque a TASK-34 é a revisão final transversal de qualidade, segurança, LGPD e operação, e as fontes de verdade ainda possuem dependências obrigatórias pendentes ou bloqueadas:

- `TASK-29B` permanece `Blocked` no conjunto `TASK-13` a `TASK-33`: os produtores reais de `visualizacao_perfil` e `compartilhamento` ainda não existem de forma persistida, e a task explicitamente proíbe criar eventos fake, endpoint simulado ou mock para fechar o critério.
- O `README.md` operacional vigente posiciona a `TASK-41` antes da `TASK-34` para publicar ou bloquear explicitamente as páginas legais públicas. A `TASK-41` está `Pending` e as minutas em `_product/legal` ainda contêm placeholders de responsável legal, CNPJ/CPF, e-mails, endereço e datas, além de exigirem aprovação do fundador e revisão jurídica antes de publicação.
- A revisão final de LGPD não deve mascarar essas pendências com documentação incompleta, dados inventados, publicação de placeholder ou simulação de fluxos de consentimento/exclusão.

Decisão registrada em `adrs/0184-bloqueio-task34-qualidade-lgpd-operacao.md`.

Retomar a TASK-34 somente quando:

1. `TASK-41` estiver `Completed`, ou seu bloqueio legal/editorial tiver sido aceito explicitamente para fora do MVP.
2. As pendências remanescentes da `TASK-29B` tiverem produtores reais implementados, ou o produto tiver aceito explicitamente manter `visualizacao_perfil`/`compartilhamento` fora do MVP sem mock.
3. A execução puder auditar rotas, índices, soft delete, paginação, logs e fluxos LGPD com o escopo final estabilizado.

## Execução 2026-06-29 — concluída com exceções explícitas

Retomada autorizada pelo produto em 2026-06-29 após aceite explícito de manter a `TASK-41` fora do MVP por enquanto. A `TASK-29B` já estava concluída com produtores reais de `visualizacao_perfil` e `compartilhamento`; nenhum evento fake, endpoint simulado ou mock foi criado.

Limitação de design registrada: Builder/Quick Copy não estava disponível como ferramenta acionável neste ambiente. A revisão visual usou `_product/tasks/PROTO-INVENTORY.md`, `_product/tasks/ROADMAP-REVALIDADO.md`, imagens locais e smoke HTTP/browser local das rotas principais.

Evidências objetivas:

- Autenticação/autorização:
  - `_auth` continua validando `Authorization: Bearer <jwt>`, sessão/token e `x-device`, preenchendo `req.auth`/`req.device`.
  - `backend/src/main/server/imports/write.ts` mantém `mountRoleGuardedRoute`, `requireRole` e `assertPrivateRoleGuards()` no boot.
  - Smoke via `tsx`: paciente em rota psicólogo-only → `403`; psicólogo em rota paciente-only → `403`; papéis corretos chamam `next()`.
  - Smoke HTTP local sem credenciais: `/api/private/psychologist/analytics` → `401`, `/api/private/patient/profile` → `401`, `/api/private/directory/psychologists?limit=1&page=1` → `200`.
- Ownership/escopo:
  - Rotas de paciente/psicólogo revisadas para usar `req.auth.id`/`data.auth.id` como fronteira de ownership em perfil, analytics, favoritos, follows, reviews, billing, WhatsApp, conta, notificações e ações de comunidade.
  - Descoberta pública/neutra permanece em `/api/private/directory/psychologists`, separada de autogestão do psicólogo.
- Índices:
  - Conferência estática por script Node comparou `@@index`/`@@unique` exatos do `DATA-MODEL.md` com `backend/prisma/schema.prisma`: 39 padrões exatos presentes; a única ausência é `professional_document @@index([psychologist_id, type])`, bloqueada por `TASK-11`/ADR-0017 por falta de storage privado de CRP e, portanto, não criada nesta task.
  - Exemplos críticos confirmados: `payment_event @@unique([gateway, external_id])`, `professional_subscription @@index([psychologist_id, status])`, `notification @@index([user_id])`, relacionamentos comunidade/posts/reviews/favorites/follows.
- Soft delete e retenção:
  - Removida exclusão física de relações de catálogo do perfil gratuito (`psychologist_specialty`, `psychologist_service`, `psychologist_approach`): agora `updateMany` com `deleted=true/deletedAt` e `upsert` para restaurar relações.
  - `user_background` e `notification_subscription` passaram a soft delete; dispatcher web-push filtra subscriptions com `deleted=false`.
  - Varredura `deleteMany` restante aponta apenas `user_token` (credencial/sessão efêmera) e métodos HTTP `DELETE` que executam soft delete no repository.
- Paginação:
  - Listagens revisadas para `page`/`limit`, default `20`, máximo `50`.
  - Ajustados posts (`DEFAULT_LIMIT=20`, `MAX_LIMIT=50`) e notificações (cap explícito `50` antes de `format`).
- LGPD mínima:
  - `psychologist_profile.cpf` e `whatsapp` permanecem fora dos logs; exclusão de conta limpa CPF/WhatsApp e despublica o perfil.
  - `billing_address` agora é soft-deletado e anonimizado na exclusão de conta.
  - `payment_method` persiste apenas token do gateway + dados de exibição (`brand`, `last4`, validade), sem PAN/CVV; exclusão de conta remove display e substitui token por marcador não operacional.
  - `log__user` segue como trilha de auditoria existente; log de exclusão não grava e-mail original em claro.
  - Consentimento de termos permanece coletado no cadastro/Google OAuth conforme fundação existente; páginas públicas legais da `TASK-41` seguem fora do MVP por aceite explícito e não foram publicadas com placeholders.
- Logs:
  - Socket deixou de imprimir payload JWT completo (e-mail/device); log atual expõe apenas `user_id`, `role` e marcador `device_id: "[redacted]"`.
  - Removido log da chave completa de objeto público em `unlink`.
  - Erros OAuth/e-mail/servidor foram reduzidos a mensagens/códigos sanitizados.
- Frontend:
  - Rotas principais revisadas por check/build e smoke local: `/`, `/auth/login`, `/auth/register/patient`, `/auth/register/psychologist`, `/psychologists`, `/community`, `/app/profile`, `/app/notifications`, `/app/settings/account`, `/app/professional/profile/setup`, `/app/professional/analytics`, `/app/professional/billing`.
  - Estados PT-BR, loading/erro/vazio/sucesso e acessibilidade básica verificados em componentes compartilhados (`LoadingState`, `InlineAlert`, `EmptyState`, navegações com `aria-label`, foco visível). `rg "<img"` não encontrou `<img>` em `frontend/src`.
  - Rotas privadas sem sessão redirecionam/mostram shell de autenticação em vez de expor dado privado.
- Mocks/packages:
  - Nenhum package instalado; `package.json`/lockfiles sem diff.
  - `rg mock|fake|faker|sample` não encontrou mock/endpoint simulado em produto; ocorrências restantes são helpers de validação/seed de desenvolvimento e placeholders de formulário.

Validações executadas:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke role guard via `pnpm --dir backend exec tsx -`
- Smoke HTTP frontend/backend local nas rotas listadas acima

ADRs:

- `adrs/0184-bloqueio-task34-qualidade-lgpd-operacao.md` atualizado como histórico/superado pela exceção.
- `adrs/0185-hardening-operacional-task34.md` criado para decisões de hardening operacional, LGPD mínima, exceções e validações.

## Complemento 2026-06-30 — bloqueio de CPF/CRP por validação profissional

Decisão de produto: CPF e CRP continuam editáveis para psicólogos gratuitos ou sem validação profissional usada como base de entitlement. Os campos passam a ficar bloqueados somente quando o profissional possui assinatura/cortesia profissional ativa não gratuita e aquele CPF/CRP foi confirmado por consulta real ao CFP/InfoSimples (`cfp_verified_at` preenchido).

Referência visual consultada: `_product/proto/Editar Perfil - Psicólogo.jpg`. Builder/Quick Copy não está disponível como ferramenta direta neste ambiente; a alteração é de regra/estado de campo dentro da tela já existente, preservando a fundação de formulário da `TASK-02`.

Critérios complementares:

- [x] Backend expõe `profile.identity_fields_locked` como flag derivada, sem novo schema.
- [x] A flag só é verdadeira para plano profissional/cortesia ativa não gratuita com `cfp_verified_at`, CPF e CRP persistidos.
- [x] Atualização do perfil ignora tentativas de alterar CPF/CRP quando `identity_fields_locked=true`.
- [x] Frontend bloqueia CPF/CRP com explicação ao psicólogo somente quando a flag do backend estiver ativa.
- [x] Psicólogo gratuito permanece com CPF/CRP editáveis.
- [x] Nenhum mock, migration ou package novo foi criado.

Validações executadas:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local headless em `http://localhost:3100/app/professional/profile/setup`, viewport 390x844, contra o build atual.

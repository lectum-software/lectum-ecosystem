# TASK-34: Qualidade, segurança, LGPD e operação

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-34 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Qualidade |
| Status | Pending |
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

- [ ] Rotas privadas principais foram revisadas quanto a autenticação/autorização (Bearer + `x-device`), sem autenticação paralela.
- [ ] Guarda de papel auditada: rotas `/psychologist/*` e `/patient/*` com `requireRole` fail-closed, check de boot ativo e smoke test (paciente → `403` em rota psicólogo-only e vice-versa) passando; descoberta em `/directory/*`.
- [ ] Estados loading/erro/vazio/sucesso revisados nas rotas principais, em PT-BR, desktop e mobile.
- [ ] Índices `@@index`/`@@unique` nomeados no `DATA-MODEL.md` conferidos no `schema.prisma`.
- [ ] Soft delete (`deleted=false`) respeitado em todas as queries de produto; sem exclusão física.
- [ ] Listagens usam a paginação do "Contrato padrão de API" (`page`/`limit`).
- [ ] Campos LGPD-sensíveis (`psychologist_profile.cpf`, `whatsapp`, `billing_address`, `payment_method`) com manuseio documentado e fora dos logs; `payment_method` sem PAN/CVV.
- [ ] Auditoria de ações relevantes via `log__user` existente; sem tabela de auditoria paralela.
- [ ] Logs revisados sem dados sensíveis em claro.
- [ ] Fluxos LGPD mínimos (consentimento, exclusão/anonimização, privacidade) documentados.
- [ ] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado restou.
- [ ] Packages de teste continuam candidatos; nenhum instalado sem consulta a `PACKAGES.md` + ADR. Sentry, embora decidido, só foi instalado/configurado nesta task ou em task dedicada.
- [ ] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [ ] ADR criado ou atualizado em `adrs/`.
- [ ] Checks/builds relevantes foram executados sem erros.
- [ ] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.

# TASK-10: Consulta CFP e resultado

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-10 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Psicólogo |
| Status | Blocked |
| Dependências | TASK-02, TASK-03, TASK-09 |
| ADR alvo | ADR de integração CFP |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Verificação de CPF - Consulta CFP.jpg` | `figma-design-frame-50-Verifica--o-de-CPF---Consulta-CFP.html` |
| `_product/proto/Carregando Consulta CFP.jpg` | `figma-design-frame-52-Carregando-Consulta-CFP.html` |
| `_product/proto/Resultado CFP - Variação em Cards.jpg` | `figma-design-frame-35-Resultado-CFP---Varia--o-em-Cards.html` |
| `_product/proto/Resultado CFP - Não Encontrado.jpg` | `figma-design-frame-51-Resultado-CFP---N-o-Encontrado.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

A jornada mostra consulta por CPF/CFP, loading e resultados em cards. Como não se pode simular dado profissional, esta task é dependente da decisão de integração.

## Objetivo

Consultar CFP/CRP por integração real ou registrar bloqueio formal se a decisão externa ainda não existir.

## Pré-requisitos e bloqueios

- A consulta CFP automática permanece **bloqueada** pela TASK-03 / ADR-0006 até existir fonte oficial, API contratada ou processo autorizado. Parar antes de qualquer chamada real e **não usar mock**, scraping não autorizado nem dado inventado.
- A aprovação manual de CRP é o fluxo inicial decidido e continua necessária mesmo se uma API CFP for adicionada futuramente. Se a consulta automática não existir, encaminhar para TASK-11 (upload CRP + análise manual).
- `psychologist_profile.cfp_verified_at` só é preenchido com consulta CFP real (ver `DATA-MODEL.md`); sem ela, manter `crp_status="pendente"`.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/psychologist/cfp`

Implementação esperada:

- Criar tela de entrada de CPF/CRP e estados de loading/resultado/não encontrado.
- Exibir somente dados retornados pela integração real.
- Permitir seleção de resultado quando houver múltiplos registros.
- Não preencher cards com dados inventados.
- Persistir seleção no perfil profissional.

## Escopo backend

Este é um **módulo novo** (domínio de verificação profissional): seguir os padrões de controller/service/repository do `ARCHITECTURE.md` e registrar as rotas em `backend/src/main/server/imports/write.ts`. Não recriar autenticação, helpers de resposta ou validator.

Implementação esperada:

- Criar provider/interface de consulta CFP **agnóstica ao fornecedor** somente quando a fonte/API for definida em nova ADR.
- Endpoint privado para consultar e salvar resultado selecionado.
- Persistir payload auditável mínimo da consulta em `professional_registry_check` (campo `raw`, ver `DATA-MODEL.md`).
- Ao confirmar resultado, atualizar `psychologist_profile.cpf` e `psychologist_profile.cfp_verified_at` (ver `DATA-MODEL.md`).
- Tratar rate limit, não encontrado (`professional_registry_check.found=false`) e erro de provedor.
- Não fazer scraping não autorizado sem decisão explícita.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `professional_registry_check` (ver `DATA-MODEL.md`) — log da consulta (`cpf`, `found`, `raw`, `checked_at`).
- `psychologist_profile` (ver `DATA-MODEL.md`) — campos `cpf`, `cfp_verified_at`, `crp_status`; **não inventar campos**.

Endpoints esperados (autogestão do psicólogo, sob `/api/private/psychologist/*`):

- POST `/api/private/psychologist/cfp/search`
- POST `/api/private/psychologist/cfp/confirm`

**Guarda de papel:** estes endpoints são exclusivos de psicólogo. Vivem sob `/api/private/psychologist/*` e são protegidos por `requireRole("psicologo")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`, sem `next()`). O escopo de ownership é feito por `req.auth.id`. Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

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

- Prisma
- Zod
- date-fns

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

- [ ] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [ ] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [ ] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [ ] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [ ] Rotas sob `/api/private/psychologist/*` exigem `requireRole("psicologo")` (fail-closed), conforme ADR-0002.
- [ ] Bloqueio CFP automático respeitado: sem fonte/API autorizada, parar com pendência, sem mock nem scraping não autorizado.
- [ ] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [ ] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [ ] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [ ] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [ ] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
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

## Execução bloqueada em 2026-06-05

- Dependências documentais confirmadas: TASK-02, TASK-03 e TASK-09 estão com `Status | Completed |` em seus arquivos.
- Referências visuais consultadas pelas imagens locais:
  - `_product/proto/Verificação de CPF - Consulta CFP.jpg`;
  - `_product/proto/Carregando Consulta CFP.jpg`;
  - `_product/proto/Resultado CFP - Variação em Cards.jpg`;
  - `_product/proto/Resultado CFP - Não Encontrado.jpg`.
- Builder/Quick Copy não está exposto como ferramenta direta neste ambiente; por isso foi usado o fallback auditável das imagens locais.
- Bloqueio externo confirmado: não há fonte oficial, API contratada ou processo autorizado para consulta automática CFP/CRP.
- A implementação de `POST /api/private/psychologist/cfp/search`, `POST /api/private/psychologist/cfp/confirm`, provider CFP e modelo `professional_registry_check` foi interrompida antes de qualquer código, chamada real, scraping ou dado inventado.
- `psychologist_profile.cfp_verified_at` deve permanecer `null`; `psychologist_profile.crp_status` deve permanecer `"pendente"` sem consulta real.
- ADR criado: `adrs/0015-bloqueio-consulta-cfp-automatica.md`.
- Encaminhamento operacional: seguir para o fluxo manual da TASK-11 (upload/validação de CRP) quando houver storage R2 privado e credenciais/bucket reais conforme a própria TASK-11.

## Validação executada

- Revisão manual de `TASK-10`, `_product/decisions.md`, `DATA-MODEL.md` e `adrs/0006-integracoes-externas-e-decisoes-pendentes.md`.
- `git diff --check`

## Observação sobre critérios de aceite

Os critérios acima permanecem sem marcação completa porque a task está formalmente bloqueada por requisito externo. Não houve implementação de tela, endpoint, provider, schema ou mock.

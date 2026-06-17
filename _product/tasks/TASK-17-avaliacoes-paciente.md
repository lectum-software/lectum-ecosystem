# TASK-17: Avaliações pelo paciente

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-17 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Avaliações |
| Status | Completed |
| Dependências | TASK-02, TASK-15, TASK-16 |
| ADR alvo | ADR-0023 |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Avaliar do Psicólogo.jpg` | `figma-design-frame-32-Avaliar-do-Psic-logo.html` |
| `_product/proto/Confirmação de Avaliação.jpg` | `figma-design-frame-27-Confirma--o-de-Avalia--o.html` |
| `_product/proto/Avaliações Feitas - Paciente.jpg` | `figma-design-frame-26-Avalia--es-Feitas---Paciente.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Avaliações são sensíveis para reputação. Não podem ser criadas sem usuário real nem com profissional fake. A elegibilidade deve estar ligada a contato/interação persistida.

## Objetivo

Permitir que pacientes avaliem psicólogos com regra de elegibilidade real e lista de avaliações feitas.

## Pré-requisitos e bloqueios

- Sem regra de elegibilidade, registrar ADR antes de permitir avaliação.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/reviews/new`
- `/app/reviews/success`
- `/app/reviews`

Implementação esperada:

- Criar formulário de avaliação com nota, texto e critérios.
- Criar confirmação pós-envio.
- Criar lista de avaliações feitas pelo paciente.
- Usar mutations e queries React Query.
- Bloquear UI quando usuário não for elegível.

## Escopo backend

**Guarda de papel:** estes endpoints são exclusivos de paciente, vivem sob `/api/private/patient/*` e são protegidos por `requireRole("paciente")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`). O escopo de ownership usa `req.auth.id` (autor da avaliação). O **alvo** da avaliação é um psicólogo (`:id` = `user.id`), mas a ação é executada **pelo** paciente sob `/api/private/patient/...`. Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

Implementação esperada:

- Criar a avaliação usando o modelo `professional_review` (ver `DATA-MODEL.md`): `rating Int` validado na faixa 1..5, `comment String?`, `status @default("publicada")` (`"publicada" | "oculta"`), `@@unique([psychologist_id, author_id])` (1 avaliação por par paciente/psicólogo).
- Validar elegibilidade antes de permitir avaliar. A regra de elegibilidade (quem pode avaliar — ex.: exigir `contact_request` prévio) é **decisão de ADR desta task**; o modelo `professional_review` apenas armazena o resultado. Registrar a regra escolhida no ADR e referenciar a forma do schema em `DATA-MODEL.md`.
- Endpoints para criar/listar avaliações do paciente.
- Recalcular `psychologist_profile.rating_avg`/`rating_count` (ver `DATA-MODEL.md`: `rating_avg` é a média ×100) de forma transacional após criar avaliação aprovada; o recálculo detalhado é coberto na TASK-19.
- Moderar conteúdo via `status` (`"oculta"`) sem apagar o registro real (soft-only).

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `professional_review`
- `contact_request` (insumo de elegibilidade, conforme ADR)
- `psychologist_profile` (agregados `rating_avg`/`rating_count`)

Endpoints esperados (privados, sob `/api/private/patient`):

- POST `/api/private/patient/reviews` (alvo: psicólogo `:id` = `user.id` no body)
- GET `/api/private/patient/reviews` (avaliações feitas pelo paciente autenticado)
- GET `/api/private/patient/reviews/eligibility/:id` (`:id` = `user.id` do psicólogo alvo)

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

- React Hook Form
- Zod
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
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Rotas sob `/api/private/patient/*` exigem `requireRole("paciente")` (fail-closed), conforme ADR-0002.
- [x] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [x] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
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


## Execucao

- Dependencias confirmadas: TASK-02, TASK-15 e TASK-16 estavam concluidas.
- Builder Quick Copy ativo (`vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`) nao foi usado nesta sessao por indisponibilidade operacional; a validacao visual usou as imagens locais obrigatorias `_product/proto/Avaliar do Psicologo.jpg`, `_product/proto/Confirmacao de Avaliacao.jpg` e `_product/proto/Avaliacoes Feitas - Paciente.jpg`.
- Regra de elegibilidade registrada na ADR-0023: paciente so avalia psicologo publicado apos `contact_request` real de WhatsApp persistido pela TASK-16.
- Backend criado em `/api/private/patient/reviews`, protegido no mount por `requireRole("paciente")`, com listagem, elegibilidade e criacao transacional.
- Frontend criado nas rotas `/app/reviews/new`, `/app/reviews/success` e `/app/reviews`, mobile-first, usando React Query, `api/req`, `api/callers`, query keys e fundacao de formulario da TASK-02.
- Nao houve alteracao em `backend/prisma/schema.prisma` nem em migrations; `db:migrate` nao se aplicou nesta task.

## Validacoes executadas

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP real: elegibilidade, criacao, listagem, duplicidade e fail-closed para psicologo.
- Browser local headless em `http://localhost:3000/app/reviews` com sessao real de paciente.

## ADR

- `adrs/0023-avaliacoes-paciente-elegibilidade-contato.md`


## Execução complementar - 2026-06-17 - Avaliar Profissional por estrelas

- Header da rota `/app/reviews/new` refinado sem fundo/card branco superior, mantendo apenas voltar e título sobre o fundo da página.
- Card do profissional passou a exibir nome com selo de verificado e a linha `Profissão • CRP`, usando os dados reais retornados pela elegibilidade.
- Contrato de elegibilidade de avaliações enriquecido com `psychologist_crp`, `psychologist_gender` e `psychologist_verified`, sem alteração de schema Prisma.
- Select de nota removido: a nota agora é definida somente por estrelas acessíveis (1 a 5) integradas ao React Hook Form/Zod.
- Depoimento passou a ser obrigatório na UI e no validador da API de criação de avaliação; envio fica desabilitado até nota e depoimento estarem preenchidos.
- Mensagens amigáveis validadas: `Selecione uma nota para o profissional.` e `Escreva um depoimento sobre sua experiência.`.
- Sem novos packages e sem alterações em `backend/prisma/schema.prisma` ou migrations; `db:migrate` não se aplicou.

### Validações complementares

- `pnpm check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- Browser local/CDP em `http://localhost:3000/app/reviews/new?psychologist_id=demo-psychologist-marcelo-pires` com sessão real de paciente: header transparente, ausência de select, 5 estrelas, selo verificado, `Profissão • CRP`, botão desabilitado antes dos requisitos e habilitado após nota + depoimento.

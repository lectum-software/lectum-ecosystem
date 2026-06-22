# TASK-19: Avaliações do psicólogo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-19 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Psicólogo privado |
| Status | Completed |
| Dependências | TASK-17, TASK-18A, TASK-31, TASK-31A, TASK-31B |
| ADR alvo | ADR-0025 |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Minhas Avaliações - Psicólogo.jpg` | `figma-design-frame-13-Minhas-Avalia--es---Psic-logo.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

A tela deve mostrar avaliações reais recebidas e não permitir manipular nota pelo frontend.

## Objetivo

Criar tela privada onde o psicólogo acompanha avaliações recebidas e métricas básicas.

## Pré-requisitos e bloqueios

- Depende da TASK-17 para criação de avaliações reais.
- A antiga dependência da TASK-18 completa foi revalidada em 2026-06-09: documentos/upload de
  CRP foram abandonados como bloqueio deste fluxo; o perfil executável é o recorte real da
  TASK-18A e a elegibilidade para receber avaliações depende de Plano Profissional ativo ou
  cortesia manual administrativa.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/professional/reviews`

Implementação esperada:

- Criar listagem paginada (contrato de `DATA-MODEL.md`) com filtros por nota/data.
- Exibir resumo de média e quantidade (a partir de `psychologist_profile.rating_avg`/`rating_count`).
- Permitir responder a uma avaliação (`response`), sem editar a nota/comentário recebidos.
- Exibir estado vazio quando não houver avaliações.
- Não permitir editar nota recebida.
- Usar query keys próprias.

## Escopo backend

Implementação esperada:

- Endpoint privado para ler as avaliações do profissional autenticado a partir de `professional_review` (ver `DATA-MODEL.md`), filtrando por `psychologist_id` do usuário logado e considerando `status="publicada"` para agregados.
- Permitir que o psicólogo responda a uma avaliação preenchendo `professional_review.response` e `responded_at` (ver `DATA-MODEL.md`); nunca alterar `rating`/`comment` recebidos.
- Calcular média e distribuição por nota e **recomputar `psychologist_profile.rating_avg`/`rating_count`** de forma transacional (`rating_avg` armazenado como média ×100, conforme `DATA-MODEL.md`).
- Paginar respostas usando o contrato padrão de `DATA-MODEL.md`: query `page` (1-based) e `limit` (default 20, máx 50); resposta `data: { items, total, page, limit }`.
- Garantir que o psicólogo só veja/responda suas próprias avaliações.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `professional_review` (leitura + `response`/`responded_at`)
- `psychologist_profile` (recálculo de `rating_avg`/`rating_count`)

Endpoints esperados (autogestão do psicólogo, sob `/api/private/psychologist/*`):

- GET `/api/private/psychologist/reviews` (paginado)
- POST `/api/private/psychologist/reviews/:id/response`

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
- [x] Rotas sob `/api/private/psychologist/*` exigem `requireRole("psicologo")` (fail-closed), conforme ADR-0002.
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


## Revalidacao de bloqueio em 2026-06-09

- Decisao de produto: a documentacao/upload de CRP do perfil deixou de ser dependencia para esta funcionalidade; a validacao profissional ocorre via API InfoSimples ou por cortesia manual administrativa.
- A area privada executavel usada como base e o recorte real de perfil profissional em `/app/professional/profile/setup` (TASK-18A), com entitlements de assinatura das TASK-31/31A/31B.
- Nova regra de dominio: somente psicologos com Plano Profissional ativo ou cortesia manual podem receber avaliacoes. A elegibilidade do paciente e a autogestao do psicologo foram ajustadas para exigir esse entitlement.

## Execucao concluida em 2026-06-09

- Referencia visual consultada via imagem local `_product/proto/Minhas Avaliacoes - Psicologo.jpg`; Builder/Quick Copy nao esteve acessivel neste ambiente.
- Backend implementado em `/api/private/psychologist/reviews` com listagem paginada, filtros por nota/periodo, resumo, distribuicao e resposta transacional da avaliacao.
- Frontend implementado em `/app/professional/reviews`, com estados de loading, erro, vazio, filtros e formulario de resposta usando React Hook Form/Zod via `hooks/form`.
- A tela de perfil privado recebeu link para "Minhas Avaliacoes".
- Nenhum schema Prisma ou migration foi criado nesta task; os modelos existentes `professional_review` e `psychologist_profile` foram reutilizados.
- Validacoes executadas: `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm check` e Chrome headless local em `/app/professional/reviews` (sem sessao autenticada, validando protecao/redirect para login).

## Ajuste visual complementar em 2026-06-09

- Tela `/app/professional/reviews` realinhada à referência `Minhas Avaliações - Psicólogo.jpg`: header mobile, card de média, barras de distribuição, lista de depoimentos, resposta destacada, formulário inline e botão pontilhado para carregar avaliações anteriores.
- Filtros visíveis foram removidos do primeiro corte visual para aproximar o protótipo; a consulta segue real, paginada e sem dados simulados.
- O formulário de resposta continua usando React Hook Form/Zod via fundação de `frontend/src/hooks/form`.
- Validações do ajuste: `pnpm --dir frontend check`, `pnpm check`, `pnpm --dir frontend exec next build --turbo`, `pnpm --dir frontend build` e browser local em `/app/professional/reviews` (sem sessão autenticada, validando resposta da rota e gate de login).
- ADR complementar: ADR-0034.

## Ajuste de demonstração premium em 2026-06-18

- Decisão de produto: psicólogos no Plano Gratuito não devem mais encontrar bloqueio/erro ao abrir `/app/professional/reviews`; a tela permanece acessível e comunica o benefício desbloqueado pelo upgrade.
- `GET /api/private/psychologist/reviews` agora retorna `200` em modo `preview` para quem não possui Plano Profissional/cortesia, com `access.can_receive_reviews=false`, lista vazia e resumo zerado, sem criar avaliação fictícia.
- `POST /api/private/psychologist/reviews/:id/response` continua exigindo entitlement profissional, pois só deve operar sobre avaliações reais elegíveis.
- Frontend ajustado para exibir o estado premium `Desbloqueie avaliações de pacientes`, benefícios solicitados com checkmarks e CTA `Fazer upgrade` para `/app/professional/billing/subscription`.
- O estado vazio genérico continua disponível para profissionais elegíveis que ainda não receberam avaliações reais; o Plano Gratuito usa o estado premium explicativo.
- Builder/Quick Copy não esteve acessível como ferramenta direta neste ambiente; validação visual usou `_product/proto/Minhas Avaliações - Psicólogo.jpg`, tela de assinatura e browser local/headless.
- Nenhum schema Prisma, migration, package novo, mock, seed ou avaliação simulada foi criado.
- ADR complementar: ADR-0118.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, API real com psicólogo temporário gratuito e browser local/headless 390x844 em `/app/professional/reviews`.

## Refinamento visual premium em 2026-06-18

- As telas `/app/professional/reviews` e `/app/professional/analytics` foram refinadas para compartilhar a linguagem visual da tela `/app/professional/billing/subscription`.
- Minhas Avaliações mantém acesso liberado ao Plano Gratuito e passa a exibir um estado premium mais aspiracional, com card central, fundo azul-claro, ícone de credibilidade, benefícios com checkmarks e CTA `Fazer upgrade` para `/app/professional/billing/subscription`.
- Header, espaçamentos, bordas, sombras e responsividade foram ajustados para evitar aparência de painel administrativo genérico.
- Responsividade revisada em 390x844 e 1024x768: card premium ocupa a largura útil, benefícios quebram corretamente, CTA respeita o card e não há overflow horizontal real.
- Nenhum mock, avaliação fictícia, schema, migration ou package novo foi criado.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, API real com psicólogo temporário gratuito e browser local/headless em `/app/professional/reviews` e `/app/professional/analytics`.

## Ajuste complementar em 2026-06-22 - link de avaliações na tela de avaliações

- Pedido de produto: concentrar tudo relacionado a avaliações em `/app/professional/reviews`, movendo a seção `Link da minha página de avaliações` para logo abaixo do header `Minhas Avaliações`.
- A seção mantém o campo com a URL pública de avaliação, botão de copiar, mensagens de sucesso/erro do clipboard e geração da URL com `psychologist_id` do usuário autenticado.
- A seção passou a ficar antes do bloco de nota média, estrelas, distribuição, estado vazio, estado premium e lista de depoimentos.
- A tela `/app/professional/analytics` deixou de renderizar essa seção; analytics permanece focada em métricas, vídeo e origem de tráfego.
- Nenhum endpoint, schema, migration, package, mock, seed ou dado simulado foi criado.
- Builder/Quick Copy não estava disponível como ferramenta direta; validação visual usou browser local/headless mobile `390x844`.
- ADR atualizado: `adrs/0025-bloqueio-task19-dependencia-task18.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build` e Chrome/CDP autenticado confirmando ausência da seção em `/app/professional/analytics`, presença em `/app/professional/reviews`, botão de copiar, URL com `psychologist_id` e ordem antes dos blocos de avaliações/estado vazio.

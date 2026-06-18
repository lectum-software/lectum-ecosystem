# TASK-20: Analytics do psicólogo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-20 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Psicólogo privado |
| Status | Completed |
| Dependências | TASK-16, TASK-17, TASK-18A, TASK-19, TASK-31 |
| ADR alvo | ADR-0033 |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Meus Analytics - Psicólogo.jpg` | `figma-design-frame-18-Meus-Analytics---Psic-logo.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Analytics não pode ser decorativo. Cada número precisa vir de evento ou tabela persistida. Analytics é recurso **exclusivo do Plano Profissional** (PRD §13): gatear o acesso por `professional_subscription` ativa.

## Objetivo

Exibir analytics reais de perfil, contatos, posts e avaliações do psicólogo.

## Pré-requisitos e bloqueios

- Métricas sem evento persistido devem ficar ausentes/zeradas com explicação, não simuladas.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/professional/analytics`

Implementação esperada:

- Criar tela de métricas com cards e períodos.
- Usar dados reais e mostrar vazio quando não houver eventos.
- Não inventar crescimento percentual.
- Adicionar filtros de período.
- Reutilizar componentes de cards e charts simples sem pacote novo se possível.

## Escopo backend

Implementação esperada:

- Criar endpoint agregado de analytics do psicólogo, gateado por Plano Profissional (`professional_subscription` ativa).
- Cada card lê **exatamente** o modelo/consulta mapeado abaixo (ver `DATA-MODEL.md`). Não derivar número de fonte fora desta tabela.
- Se visualização de perfil ainda não for rastreada (`profile_view_event` não criado), **omitir a métrica honestamente** (ausente/zerada com explicação) — nunca simular.
- Garantir escopo do usuário autenticado (`psychologist_id` = usuário logado).

### Mapeamento métrica → fonte (card → modelo/consulta)

| Card / métrica | Modelo (ver `DATA-MODEL.md`) | Consulta |
|---|---|---|
| Cliques em WhatsApp | `contact_request` | `count` por `psychologist_id` + janela `createdAt` (filtro de período) |
| Avaliações recebidas / média | `professional_review` (+ `psychologist_profile.rating_avg`/`rating_count`) | `count` por `psychologist_id, status="publicada"`; média já materializada em `psychologist_profile` |
| Posts publicados / engajamento | `community_post` | `count` por `author_id` (= usuário logado); somar `upvotes_count`/`replies_count` denormalizados |
| Visualizações de perfil | `profile_view_event` (opcional) | `count` por `psychologist_id` + período; **se o modelo não existir, omitir o card** (sem fabricar) |

- Variações percentuais (crescimento) só aparecem se houver dois períodos reais comparáveis nas fontes acima; caso contrário, **não exibir %**.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `contact_request`
- `professional_review`
- `community_post`
- `profile_view_event` (opcional)
- `professional_subscription` (gate de Plano Profissional)

Endpoints esperados (autogestão do psicólogo, sob `/api/private/psychologist/*`):

- GET `/api/private/psychologist/analytics`

**Guarda de papel:** este endpoint é exclusivo de psicólogo. Vive sob `/api/private/psychologist/*` e é protegido por `requireRole("psicologo")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`, sem `next()`). O escopo de ownership é feito por `req.auth.id`. Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

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
- date-fns
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

## Execução 2026-06-09

- Builder/Quick Copy não estava disponível como ferramenta neste ambiente; a referência visual `_product/proto/Meus Analytics - Psicólogo.jpg` foi consultada localmente.
- Implementado `GET /api/private/psychologist/analytics` com mount `requireRole("psicologo")` fail-closed e gate por assinatura/cortesia profissional ativa em `professional_subscription`.
- As métricas exibidas vêm somente de fontes persistidas: `contact_request`, `professional_review`, `psychologist_profile` e `community_post`.
- `profile_view_event` não existe no schema atual; visualizações de perfil foram omitidas/explicadas na UI para evitar simulação.
- Não houve alteração em `backend/prisma/schema.prisma` ou migrations; `db:migrate` não se aplica a esta execução.
- A rota `/app/professional/analytics` foi criada com filtros de período, loading, erro, vazio, sucesso discreto, CTA de assinatura quando o plano profissional não existe e aviso de métricas indisponíveis sem fonte persistida.
- Não houve formulário nesta task; a fundação TASK-02 não foi necessária.
- Validações executadas:
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - Browser local via Chrome headless em `http://localhost:3000/app/professional/analytics`; sem sessão autenticada, a rota carregou e redirecionou corretamente para login.

## Ajuste visual complementar em 2026-06-09

- Tela `/app/professional/analytics` realinhada à referência `Meus Analytics - Psicólogo.jpg`: header mobile, tabs de período, grid 2x3, card de link, bloco de busca por especialidades e dica Pro.
- Métricas sem fonte persistida (`resultados de busca`, `abertura de perfil`, `video views`, `favoritado` e percentuais de especialidade) permanecem sem número real e são exibidas com `—`/mensagem discreta, sem simulação.
- Conversões WhatsApp e avaliações seguem usando os dados persistidos retornados pelo endpoint da TASK-20.
- Validações do ajuste: `pnpm --dir frontend check`, `pnpm check`, `pnpm --dir frontend exec next build --turbo`, `pnpm --dir frontend build` e browser local em `/app/professional/analytics` (sem sessão autenticada, validando resposta da rota e gate de login).
- ADR complementar: ADR-0034.

## Ajuste de demonstração premium em 2026-06-18

- Decisão de produto: psicólogos no Plano Gratuito não devem mais encontrar bloqueio/erro ao abrir `/app/professional/analytics`; a tela passa a demonstrar valor mantendo a estrutura visual disponível.
- `GET /api/private/psychologist/analytics` agora retorna `200` para psicólogos autenticados sem Plano Profissional/cortesia, preservando dados reais agregados e adicionando `access.has_professional_entitlement=false` e `access.mode="preview"`.
- Frontend ajustado para exibir banner premium `Desbloqueie seus Analytics`, CTA `Fazer upgrade` para `/app/professional/billing/subscription`, abas de período, cards e demais seções já existentes, com valores/dados sensíveis desfocados e labels legíveis.
- Erros técnicos reais continuam usando estado de erro em PT-BR; a mensagem antiga de bloqueio por plano deixou de ser exibida no fluxo normal do Plano Gratuito.
- O layout recebeu ajuste mobile-first (`grid-cols-[minmax(0,1fr)]` nos wrappers principais) para evitar trilhas implícitas maiores que a viewport e cortes laterais em 390px.
- Builder/Quick Copy não esteve acessível como ferramenta direta neste ambiente; validação visual usou `_product/proto/Meus Analytics - Psicólogo.jpg`, tela de assinatura e browser local/headless.
- Nenhum schema Prisma, migration, package novo, mock, seed ou métrica simulada foi criado. Métricas sem evento persistido continuam ausentes/zeradas com tratamento honesto.
- ADR complementar: ADR-0118.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, API real com psicólogo temporário gratuito e browser local/headless 390x844 em `/app/professional/analytics`.

## Refinamento visual premium em 2026-06-18

- As telas `/app/professional/analytics` e `/app/professional/reviews` foram refinadas para compartilhar a linguagem visual da tela `/app/professional/billing/subscription`.
- Analytics recebeu header em card, tabs em pílulas, banner premium azul-claro, métricas em cards de uma coluna no mobile e duas colunas em desktop, valores desfocados com tratamento intencional de prévia premium e card de link de avaliações no mesmo padrão visual.
- Minhas Avaliações recebeu header consistente e estado premium central com ícone, selo, benefícios em cards e CTA `Fazer upgrade` para `/app/professional/billing/subscription`.
- Responsividade revisada em 390x844 e 1024x768: sem overflow horizontal real (`scrollWidth` igual à largura da viewport), tabs cabendo no mobile, métricas em uma coluna no mobile e duas colunas no desktop.
- Nenhum mock, dado fake, schema, migration ou package novo foi criado.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, API real com psicólogo temporário gratuito e browser local/headless em `/app/professional/analytics` e `/app/professional/reviews`.

## Extensão de analytics do vídeo de apresentação em 2026-06-18

- Adicionado tracking real do vídeo de apresentação público por sessão (`profile_video_watch_session`), consolidando heartbeats por `session_key` sem criar visualizações duplicadas.
- O player público do perfil profissional envia métricas reais de reprodução: visualização, tempo único assistido, maior posição, conclusão, replays e marcos 25/50/75/100%.
- O endpoint `GET /api/private/psychologist/analytics` passou a agregar `presentation_video` com data de atualização, métricas principais e retenção por marcos; valores continuam desfocados no modo prévia para Plano Gratuito.
- A tela `/app/professional/analytics` recebeu seção exclusiva do vídeo antes do card `Link da minha página de avaliações`, com cards de métricas e bloco de retenção alinhando reprodução do vídeo e gráfico por marcos.
- A referência visual adicional usada foi a imagem fornecida pelo usuário `c:/Users/tulio/Downloads/WhatsApp Image 2026-06-18 at 15.04.58.jpeg`, inspirada em analytics de retenção de vídeo; não houve uso de mock ou dados simulados.

- Migration aplicada com `pnpm --dir backend exec prisma migrate dev --name add_profile_video_watch_sessions` após tentativa inicial de `pnpm --dir backend db:migrate` ficar presa aguardando lock/prompt e ser encerrada sem criar migration.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `Invoke-WebRequest` em `/app/professional/analytics` e POST de validação 404 em `/api/private/directory/psychologists/non-existent/video-watch`.

# TASK-27: Ranking Top Mentores

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-27 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Comunidades |
| Status | Completed |
| Dependências | TASK-03, TASK-23 |
| ADR alvo | ADR de ranking e pontuação de mentores |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Top 5 Mentores da comunidade.jpg` | `figma-design-frame-20-Top-5-Mentores-da-comunidade.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Ranking não pode ser uma lista decorativa. A regra de pontuação precisa ser transparente e não confiar em flag enviada pelo frontend.

## Objetivo

Criar ranking real de mentores com pontuação documentada e baseada em eventos persistidos.

## Pré-requisitos e bloqueios

- BLOQUEIO RÍGIDO: o ranking é **derivado** (ver `DATA-MODEL.md` "Ranking de mentores") de `post_vote` (upvotes recebidos), participação e `professional_subscription` ativa. A fórmula de pontuação é **decisão externa** — sem ADR aprovando o cálculo, a task fica bloqueada e não pode ser concluída. Materializar `mentor_score_snapshot` só após a fórmula existir.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas (convenção canônica de `DATA-MODEL.md`):

- `/app/community/top-mentors`

Implementação esperada:

- Criar tela Top 5 Mentores.
- Exibir posição, profissional, métricas que compõem pontuação e CTA para perfil.
- Mostrar vazio quando não houver dados suficientes.
- Não ordenar localmente dados incompletos.
- Usar query real.

## Escopo backend

Implementação esperada:

- Definir a fórmula de pontuação em ADR (bloqueio rígido — ver "Ranking de mentores" em `DATA-MODEL.md`).
- Endpoint de ranking por período/comunidade.
- Score derivado de eventos persistidos (`post_vote` upvotes, participação, `professional_subscription` ativa); nunca aceitar score vindo do frontend.
- Filtrar psicólogos com perfil publicado/aprovado (`psychologist_profile.published`).

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `post_vote` (upvotes recebidos)
- `community_post` / `post_reply` (participação)
- `professional_subscription` (Plano Profissional ativo — PRD §10)
- `psychologist_profile`
- `mentor_score_snapshot` (opcional, só se materializar após a fórmula existir)

Endpoints esperados (convenção canônica de `DATA-MODEL.md`):

- GET `/api/private/community/top-mentors`

Request/response: seguir o "Contrato padrão de API" de `DATA-MODEL.md`. As métricas que compõem a pontuação só podem ser retornadas após a fórmula ser aprovada em ADR.

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

- [x] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Rotas seguem a convenção canônica do `DATA-MODEL.md`.
- [x] Fórmula de pontuação aprovada em ADR antes de concluir (bloqueio rígido).
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicável.
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

## Atualizacao 2026-06-13

- Formula do ranking ajustada conforme `C:\Users\tulio\Desktop\Lectum\Sistema de Ranking de Mentores.pdf` e ADR-0070.
- Naquele momento, componentes sem fonte persistida atual (`shares_received` e `community_whatsapp_clicks`) permaneciam zerados ate existir rastreamento real por comunidade; nao usar mocks. Em 2026-07-30, `shares_received` ja deriva de `post_share`, enquanto `community_whatsapp_clicks` segue zerado ate origem persistida de comunidade.
- Responsividade mobile da tela Top Mentores corrigida conforme ADR-0071 para evitar corte/overflow horizontal em 390px.

## Atualizacao 2026-07-30 - recalibragem do score de mentores

- Pedido de produto: reformular parte da formula de Top Mentores para reduzir peso de voto simples,
  aumentar peso de relacionamento util e transformar resposta publicada em cobertura.
- Formula vigente registrada em ADR-0070 e `DATA-MODEL.md`:
  - upvote recebido `x2`;
  - downvote recebido `-3`;
  - comentario recebido `x5`;
  - compartilhamento recebido `x8`;
  - salvamento recebido `x2`;
  - WhatsApp originado da comunidade `x6`;
  - post publicado `x1`;
  - cobertura de resposta `x3`;
  - dia ativo `x1`;
  - menos penalidade progressiva por posts removidos.
- Cobertura de resposta conta no maximo uma vez por post de paciente respondido pelo psicologo no
  periodo, mesmo que ele publique varias respostas no mesmo post.
- Acoes identificaveis do proprio psicologo no proprio conteudo nao entram no score de upvotes,
  downvotes, salvamentos ou compartilhamentos recebidos.
- `community_whatsapp_clicks` continua zerado ate existir origem persistida de comunidade; nenhum
  mock, seed, endpoint simulado, schema Prisma, migration ou package novo foi criado.
- Validacoes desta atualizacao:
  - `pnpm --dir backend exec biome check --write ...`;
  - `pnpm --dir frontend exec biome check --write src/api/generator/types/community.ts`;
  - `pnpm --dir admin exec biome check --write src/api/req/communities/index.ts`;
  - `pnpm --dir backend exec tsx -e ...` validando formula pura e cobertura;
  - `pnpm --dir backend check`;
  - `pnpm --dir backend build`;
  - `pnpm --dir frontend check`;
  - `pnpm --dir admin check`;
  - `pnpm check`.
- Criterios especificos desta atualizacao:
  - [x] Pesos do Top Mentores atualizados no endpoint publico, ranking administrativo e helper de
        sinais de ranking usado em posts/digests.
  - [x] `reply_coverage_count` criado como metrica derivada sem migration, contando um post de
        paciente coberto uma unica vez por mentor.
  - [x] Autointeracoes autenticadas do psicologo no proprio conteudo excluidas dos sinais
        recebidos do score.
  - [x] ADR-0070 e `DATA-MODEL.md` atualizados com a regra vigente.
  - [x] Checks/builds relevantes executados sem erro.
  - [x] Commit proprio criado e push executado.

## Complemento 2026-06-18 - limpeza visual da tela Top 5 Mentores

- Pedido do usuário: limpar o fundo da tela `/app/community/top-mentors`, centralizar o pódio no mobile, simplificar a posição da `Classificação geral`, refinar o título e reduzir a largura visual da lista no desktop.
- Referência visual ativa: `_product/proto/Top 5 Mentores da comunidade.jpg`; Builder/Quick Copy não está exposto como ferramenta direta nesta sessão, mantendo fallback auditável pela imagem local e validação em browser local.
- O fundo da tela passou a usar o background uniforme da aplicação, removendo a superfície cinza específica da rota e evitando variações decorativas ao redor do conteúdo.
- O pódio foi reestruturado em grid simétrico com colunas laterais equivalentes, mantendo Top 1 centralizado e distâncias equilibradas para Top 2 e Top 3 no mobile.
- A posição na `Classificação geral` deixou de usar bloco/fundo metálico; agora exibe apenas medalha/ícone e número, sem card colorido atrás da posição.
- O título foi refinado como composição hierárquica com `Top 5 mentores em` em apoio e nome da comunidade como elemento principal.
- No desktop, a lista de classificação recebeu largura máxima própria para ficar mais próxima do eixo visual do pódio e evitar cards excessivamente largos.
- Escopo: sem mudanças de backend, Prisma, migrations, packages, endpoint, fórmula, ordenação ou dados do ranking.
- ADR atualizado: `adrs/0105-top-mentores-identidade-metalica.md`.
- Validações executadas: `pnpm --dir frontend exec biome check --write src/app/app/community/top-mentors/logic.tsx src/app/globals.css`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP autenticado em `/app/community/top-mentors?community=luto-e-ressignificacao`.

## Complemento 2026-08-13 - CTA WhatsApp na classificacao geral

- Pedido do usuário: na tela Top Mentores, trocar a seta lateral de perfil por ícone WhatsApp já usado na Lectum, ajustar o texto `Psicólogo` para fonte textual com primeira letra maiúscula e demais minúsculas, e garantir o mesmo selo verificado do restante do produto.
- Referência visual ativa: screenshot do usuário `WhatsApp Image 2026-08-12 at 19.33.12.jpeg` e `_product/proto/Top 5 Mentores da comunidade.jpg`; Builder/Quick Copy não está exposto como ferramenta callable nesta sessão, mantendo fallback auditável pela imagem local.
- Frontend: a `Classificação geral` mantém o corpo do card como link para o perfil público, mas a affordance lateral deixou de ser `ChevronRight` e passou a ser um botão independente com `PsychologistWhatsAppRedirectButton` + `WhatsAppIcon`.
- Backend: `GET /api/private/community/top-mentors` passou a retornar, de forma aditiva, `professional.whatsapp_name` e `professional.whatsapp_url`, derivados do perfil profissional e do helper canônico `buildProfessionalWhatsappUrl`.
- Rollout: os novos campos são opcionais no frontend para tolerar backend e frontend em versões diferentes; enquanto o backend antigo responder sem URL, o ícone aparece desabilitado em vez de quebrar a tela.
- Identidade profissional: o label passa a exibir `Psicólogo`/`Psicóloga` em title case com `font-sans`, sem uppercase/tracking exagerado.
- Selo verificado: segue usando o componente compartilhado `VerifiedBadgeIcon`, o mesmo usado nas páginas de comunidade e no perfil público do psicólogo.
- Escopo: sem alteração de fórmula, ordenação, score, elegibilidade, schema, migrations, envs, packages, seeds, snapshots ou mocks.
- ADR atualizado: `adrs/0105-top-mentores-identidade-metalica.md`.

### Critérios específicos deste complemento

- [x] Seta/chevron da linha de classificação removida e substituída por ícone WhatsApp já existente na Lectum.
- [x] CTA WhatsApp usa URL real derivada do perfil profissional, sem mock ou dado fake.
- [x] `Psicólogo`/`Psicóloga` aparece em title case com fonte textual já usada no produto.
- [x] Selo verificado usa `VerifiedBadgeIcon`, sem criar novo asset ou ícone paralelo.
- [x] Contrato backend/frontend permanece compatível durante rollout por campos aditivos e opcionais.
- [x] Nenhuma migration, env obrigatória nova ou package novo foi criada.
- [x] ADR e `DATA-MODEL.md` atualizados com a decisão de contrato e rollout.

### Validações deste complemento

- [x] `pnpm --dir backend exec biome check --write src/modules/api/private/community/repositories/support/community-feed.ts src/modules/api/private/community/repositories/queries/CommunityMentorRepository.ts src/modules/api/private/community/DTOs/ICommunityDTO.ts`
- [x] `pnpm --dir frontend exec biome check --write src/app/app/community/top-mentors/logic.tsx src/api/generator/types/community.ts`
- [x] `pnpm --dir backend check`
- [x] `pnpm --dir backend build`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] Browser local em `/app/comunidades/top-mentores` (rota carregada no servidor local; validação visual detalhada limitada pelo estado autenticado, sem criar usuário/dado artificial em homologação)
- [x] `pnpm check`
- [x] `git diff --check`
- [x] `pnpm check:encoding`
- [x] `pnpm check:adrs`
- [x] `pnpm check:tasks`
- [x] `pnpm version:bump`
- [x] `pnpm check:version`
- [x] Commit próprio criado e push em `homolog` executado.

# TASK-23: Feed de comunidade

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-23 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Comunidades |
| Status | Completed |
| Dependências | TASK-22 |
| ADR alvo | ADR de feed de comunidade |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Feed Comunidade.jpg` | `figma-design-frame-3-Feed-Comunidade.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

O feed é longo e precisa ser eficiente. Deve listar posts reais, com contadores vindos do backend. Refinamento de 2026-06-13: a tela principal é o Feed da Comunidade agregado, reunindo destaques de todas as comunidades; detalhes por comunidade serão criados em task futura.

## Objetivo

Criar feed real agregado de posts de comunidades com paginação, filtros, chips de comunidade e ações básicas.

## Refinamento vigente do Feed Global

- A tela principal é o Feed da Comunidade global, não detalhe de comunidade.
- Comunidades individuais terão telas próprias em task futura; chips e nomes de comunidade já apontam para as rotas futuras.
- Usuários finais não criam comunidades diretamente: usam "Solicitar nova comunidade" para análise da equipe.
- Criação, curadoria e moderação de comunidades pertencem à plataforma/administração, não a usuários comuns.
- O selo `TOP MENTOR`/`TOP #1 MENTOR` é apenas destaque visual e não concede permissão especial. A UI deve suportar `TOP #1 MENTOR` (ouro), `TOP #2 MENTOR` (prata) e `TOP #3 MENTOR` (bronze), usando os gradientes definidos no Figma e posicionados acima do nome do psicólogo.
- Posts de pacientes exigem título, texto/descrição e comunidade relacionada.
- A publicação anônima de paciente usa avatar com ícone anônimo e nome `Membro Anônimo`; a publicação identificada mostra nome/avatar reais do paciente.
- A prévia profissional no card só aparece quando houver resposta/comentário de psicólogo com `cfp_verified_at`; entre várias respostas verificadas, vence a de maior `upvotes_count`.
- Comentários de usuários comuns e respostas de psicólogos não verificados não entram na prévia profissional.
- WhatsApp aparece somente em respostas de psicólogos verificados com entitlement profissional pago ativo.
- O header do feed esconde ao rolar para baixo e reaparece ao rolar para cima, com transição suave.
- A navegação inferior do Feed da Comunidade substitui o item central `Comunidade` por um CTA circular azul com ícone `+`, sem texto abaixo, apontando para a rota futura de criação de post; o FAB deve manter proporção moderada e integrada à barra, sem competir visualmente com o feed.

## Pré-requisitos e bloqueios

- Depende de comunidades reais ou estado vazio honesto.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas (convenção canônica de `DATA-MODEL.md`):

- `/app/community` exibe a lista/exploração de comunidades.
- `/app/community/feed` é a rota canônica do Feed da Comunidade agregado.
- `/app/community/[slug]` fica reservado para detalhe futuro; enquanto o detalhe não existir, pode servir apenas como compatibilidade/filtro do feed.
- `/app/community/post/new` é a rota preparada para criação futura de posts de pacientes e psicólogos.

Implementação esperada:

- Criar feed agregado com infinite scroll ou paginação.
- Exibir comunidade, autor, tags, contadores, CTA de WhatsApp quando houver psicólogo e ações de post.
- Exibir busca, filtro "Todas as comunidades"/"Apenas comunidades que o usuário segue" e chips: Explorar, Ansiedade, Relacionamentos, Mulheres, Autocuidado e Luto.
- Filtrar por comunidade/categoria quando disponível sem transformar o feed agregado em página de detalhe.
- Estados loading, erro e vazio.
- Não usar array local de posts.

## Escopo backend

Implementação esperada:

- Endpoint de feed agregado paginado, com filtro opcional por comunidade para chips/compatibilidade.
- Retornar apenas posts com `community_post.status = "publicado"`.
- Usar os contadores denormalizados de `community_post` (`upvotes_count`, `downvotes_count`, `replies_count`, `saves_count`) — não recalcular por agregação a cada request.
- Índices conforme `DATA-MODEL.md` (`@@index([community_id, status, createdAt])`).
- Não expor dados privados de autores; downvote nunca exposto individualmente.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `community_post` (contadores denormalizados)
- `community`

Endpoints esperados (convenção canônica de `DATA-MODEL.md`):

- GET `/api/private/community/feed/posts`
- GET `/api/private/community/:slug/posts` (compatibilidade/detalhe futuro)

Request/response: seguir o "Contrato padrão de API" de `DATA-MODEL.md` — paginação `page`/`limit` (default 20, máx 50), busca `search`, filtro opcional `community` e `scope="all"|"following"`. Para feed muito longo avaliar cursor por `createdAt`+`id` e `@tanstack/react-virtual` (registrar em ADR).

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
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Rotas seguem a convenção canônica do `DATA-MODEL.md`.
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

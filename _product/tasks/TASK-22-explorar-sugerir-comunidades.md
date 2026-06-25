# TASK-22: Explorar e sugerir comunidades

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-22 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Comunidades |
| Status | Completed |
| Dependências | TASK-02, TASK-12 |
| ADR alvo | ADR de comunidades e sugestões |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Explorar Comunidades.jpg` | `figma-design-frame-9-Explorar-Comunidades.html` |
| `_product/proto/Sugerir Comunidade.jpg` | `figma-design-frame-23-Sugerir-Comunidade.html` |
| `_product/proto/Confirmação de Sugestão de Comunidade.jpg` | `figma-design-frame-33-Confirma--o-de-Sugest-o-de-Comunidade.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Comunidades são eixo do produto. Sugestões devem virar registros pendentes, não criar comunidades públicas automaticamente sem regra.

## Objetivo

Permitir explorar comunidades reais e sugerir novas comunidades para moderação.

## Pré-requisitos e bloqueios

- Categorias iniciais são catálogo curado decidido em `TASK-03`/seed real (campo `community.category`, ver `DATA-MODEL.md`), nunca inventadas nem mock invisível.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas (convenção canônica de `DATA-MODEL.md`):

- `/app/community`
- `/app/community/suggest`
- `/app/community/suggest/success`

Implementação esperada:

- Criar listagem de comunidades com busca/categorias.
- Criar formulário de sugestão.
- Criar confirmação de sugestão.
- Exibir estados vazios reais.
- Usar cards reutilizáveis e shell privado.

## Escopo backend

Implementação esperada:

- Modelos de comunidade e sugestão conforme `DATA-MODEL.md` (sem inventar campos).
- Endpoint de listagem de comunidades.
- Endpoint para sugerir comunidade com status inicial `pendente` (`community_suggestion.status`).
- Não publicar sugestão automaticamente sem ADR/regra.
- Índices conforme `DATA-MODEL.md` (`community` por `slug` e `category`; `community_suggestion` por `status`).

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `community`
- `community_suggestion`

Endpoints esperados (convenção canônica de `DATA-MODEL.md`):

- GET `/api/private/community`
- POST `/api/private/community/suggestions`

Request/response: seguir o "Contrato padrão de API" de `DATA-MODEL.md` — listagem paginada (`page`/`limit`, resposta `data: { items, total, page, limit }`) e envelope de sucesso/erro padrão.

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

## Execucao complementar: fundo branco e escala premium da exploracao (2026-06-17)

- Pedido do usuario: ajustar a tela `/app/community` para fundo totalmente branco, sem faixas cinzas laterais, escala mais consistente e seta sutil no carrossel desktop.
- Fonte visual auditavel: `_product/proto/Explorar Comunidades.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao.
- O container da tela passou a ocupar a largura util total com fundo branco e sem frame cinza ao redor, mantendo o shell privado e a navegacao existentes.
- O header, busca, botao de voltar, titulos, chips, CTAs e espacamentos foram reduzidos para uma escala mais proxima das demais telas premium da Lectum.
- O card `Tendencia Hoje` teve altura, padding, tipografia e sombra reduzidos para manter impacto visual sem dominar a pagina.
- Os cards de `Mais Populares` foram compactados e o carrossel ganhou uma seta discreta apenas no desktop, exibida somente quando ainda existe conteudo horizontal para rolar.
- Nao houve alteracao de backend, Prisma, migrations, endpoints, payloads, dados, ordenacao ou packages.
- ADR atualizado: `adrs/0107-explorar-comunidades-conteudo-centralizado.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check --write -- ...`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e browser local em mobile/desktop validando fundo branco, escala reduzida, card de tendencia menor e seta desktop condicional no carrossel.

## Execucao complementar: responsividade mobile da exploracao (2026-06-17)

- Pedido do usuario: corrigir a responsividade de `/app/community` para evitar cards cortados lateralmente no mobile, manter o carrossel `Mais Populares` dentro da largura util e remover o divisor abaixo da busca.
- Fonte visual auditavel: `_product/proto/Explorar Comunidades.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao.
- O carrossel de `Mais Populares` deixou de usar largura full-bleed negativa no mobile e passou a rolar dentro da largura util do conteudo, com `overscroll-x-contain`, `max-w-full` e cards dimensionados por `min(calc(100vw - 2.5rem), 212px)`.
- A pagina manteve fundo branco e passou a bloquear overflow horizontal apenas no wrapper externo, preservando a rolagem horizontal local do carrossel.
- A busca no topo perdeu a borda inferior/separador visual, ficando integrada ao topo branco da tela, com padding lateral alinhado ao restante das secoes.
- Nao houve alteracao de backend, Prisma, migrations, endpoints, payloads, dados, ordenacao ou packages.
- ADR atualizado: `adrs/0107-explorar-comunidades-conteudo-centralizado.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile 390x844 validando `documentWidth=390`, ausencia de overflow horizontal, busca sem borda inferior e primeiro card do carrossel inteiramente dentro do viewport.

## Execucao complementar: limpeza de profundidade visual em Explorar Comunidades (2026-06-17)

- Pedido do usuario: remover sombras excessivas de `/app/community`, especialmente nos cards de `Tendencia Hoje`, cards de `Mais Populares` e containers auxiliares.
- Fonte visual auditavel: `_product/proto/Explorar Comunidades.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao.
- Os cards de comunidades preservam bordas arredondadas, overlays de imagem, contraste e bordas sutis, mas deixam de usar `box-shadow` e hover de flutuacao.
- Badges sobre as imagens passaram a usar borda sutil em vez de `ring`, evitando que o navegador compute esses contornos como sombra.
- O botao de retorno, a seta do carrossel, o loading e o bloco `Sugira uma Comunidade` tambem tiveram sombras removidas para manter a pagina integrada ao fundo branco.
- Nao houve alteracao de backend, Prisma, migrations, endpoints, payloads, dados, ordenacao ou packages.
- ADR atualizado: `adrs/0107-explorar-comunidades-conteudo-centralizado.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check --write src/app/app/community/logic.tsx`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile/desktop validando `box-shadow` sem profundidade real nos elementos ajustados e ausencia de overflow horizontal.

## Execução complementar: catálogo ativo com Depressão e TDAH (2026-06-25)

- Pedido do usuário: manter comunidades Ansiedade, Relacionamentos e Autocuidado; remover Mulheres e Luto; adicionar Depressão e TDAH; associar as imagens anexadas a cada comunidade.
- Fonte visual auditável: `_product/proto/Explorar Comunidades.jpg`, `_product/proto/Feed Comunidade.jpg` e assets anexados pelo usuário (`Ansiedade.png`, `Relacionamentos.png`, `Autocuidado.png`, `Depressão.png`, `TDAH.png`). Builder/Quick Copy não está exposto como ferramenta callable nesta sessão.
- Frontend: `COMMUNITY_FEED_CHIPS` agora lista apenas Ansiedade, Relacionamentos, Autocuidado, Depressão e TDAH, preservando slugs consistentes para chips/rotas do feed.
- Frontend: os cards/carrosséis de `/app/community` passaram a usar os novos assets em `frontend/public/images/community/explore/*.png`, mantendo o padrão visual atual dos cards.
- Backend: migration `20260625143000_update_community_catalog_depressao_tdah` faz upsert das 5 comunidades ativas com `avatar_url`/paleta e remove `mulheres-em-foco` e `luto-e-ressignificacao` por soft delete.
- Backend: os ícones usados pelo detalhe de comunidade foram adicionados em `backend/public/community/icons/*.png` para servir as URLs persistidas no banco.
- `DATA-MODEL.md` foi atualizado com o catálogo vigente. `TASK-23` foi atualizada para refletir os chips ativos do feed.
- Não houve mudança de schema Prisma, endpoints, packages, mocks ou dados artificiais de posts.
- ADR criado: `adrs/0165-catalogo-comunidades-depressao-tdah.md`.
- Validações executadas: `pnpm --dir backend db:migrate`, consulta Prisma do catálogo, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `git diff --check` e HTTP local `200` para `/app/community`, asset frontend de Depressão e ícone backend de Depressão.
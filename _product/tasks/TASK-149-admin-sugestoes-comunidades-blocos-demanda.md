# TASK-149: Sugestões de comunidades no Admin com blocos de demanda

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-149 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin / Moderação |
| Status | Completed |
| Dependências | TASK-22, TASK-45, TASK-46, TASK-51, TASK-77 |
| ADR alvo | ADR-0445 |

## Contexto

O usuário final já possui o fluxo de `/app/comunidades/sugerir` implementado pela TASK-22: ele envia o tema sugerido, o backend persiste `community_suggestion` e a UI exibe confirmação de envio. A necessidade atual é exclusivamente administrativa: o painel Admin precisa receber essas sugestões para análise de demanda e permitir que administradores agrupem temas parecidos em blocos internos.

O objetivo de produto é evitar criação automática de comunidades. O Admin observa volume por bloco (ex.: muitas sugestões em "ansiedade no trabalho") e, futuramente, decide abrir uma comunidade real pelo fluxo administrativo de comunidades.

Referências visuais: a tela pertence ao Admin e deve seguir o padrão já implementado em Moderação/Operacionais (`/moderacao/operacionais`) e Comunidades Admin. Builder/Quick Copy não está disponível como ferramenta nesta sessão; fallback visual usado: screenshots enviados pelo usuário e imagens locais de `_product/proto/admin` registradas em `PROTO-INVENTORY.md`.

## Objetivo

Criar em Moderação do painel Admin a rota `/moderacao/sugestoes-comunidades`, com dados reais do banco, para listar sugestões recebidas, criar blocos de demanda, mover sugestões para dentro/fora desses blocos, arquivar sugestões e visualizar contadores que apoiem a decisão futura de abrir uma comunidade.

## Pré-requisitos e bloqueios

- Branch obrigatória: `homolog`.
- Fluxo do usuário já existe e não deve ser alterado.
- Sem requisito externo novo.
- Sem env nova.
- Banco precisa de expansão segura: nova tabela opcional de blocos e `block_id` nullable em `community_suggestion`.
- Não resetar, destruir seeds, limpar buckets ou editar migration aplicada.

## Escopo frontend/admin

- Adicionar submenu em Moderação: `Sugestões de comunidades`.
- Criar rota Admin `/moderacao/sugestoes-comunidades`.
- Mostrar cabeçalho, métricas, blocos de demanda e lista paginada de sugestões.
- Criar bloco com título e notas internas.
- Alterar status do bloco: `monitorando`, `candidata`, `convertida`, `arquivada`.
- Mover sugestão para um bloco ou deixá-la sem bloco.
- Arquivar sugestão sem apagar dados.
- Filtros por busca, status, bloco, papel do usuário e período.
- Formulários/campos com React Hook Form, Zod e controllers existentes.

## Escopo backend

- Expandir `community_suggestion` com `block_id` nullable.
- Criar `community_suggestion_block` para agrupamento interno administrativo.
- Criar endpoints privados Admin em `/api/admin/private/moderation`:
  - `GET /community-suggestions`
  - `POST /community-suggestion-blocks`
  - `PUT /community-suggestion-blocks/:blockId`
  - `POST /community-suggestions/:suggestionId/move`
  - `POST /community-suggestions/:suggestionId/archive`
- Retornar dados reais de `community_suggestion`, usuário autor e bloco.
- Registrar mutações em `admin_activity_log` com snapshots seguros, sem expor detalhes técnicos.

## Fora do escopo

- Alterar a UI ou jornada do usuário final de sugestão.
- Abrir comunidade automaticamente a partir de um bloco.
- Notificar usuários quando uma comunidade for criada.
- Dedupliação automática/IA/NLP de sugestões.
- Conversão de bloco em comunidade com vínculo definitivo além do status interno.

## Impacto em produção e plano de rollout

- Compatibilidade com dados existentes: sugestões antigas continuam válidas com `block_id = null` e `status = "pendente"`.
- Banco: expansão segura com nova tabela e coluna nullable; não há backfill obrigatório. A contração não se aplica neste deploy.
- Envs: nenhuma env nova.
- Contratos: endpoint de usuário existente continua igual; Admin novo consome endpoints aditivos. Backend novo funciona com Admin antigo; Admin novo requer backend novo apenas para esta nova rota, sem quebrar demais rotas.
- Jobs/providers: sem efeito externo.
- Ordem de deploy: backend e admin podem subir pelo deploy automático de `homolog`; frontend público não muda.
- Rollback: reverter código mantém coluna/tabela sem uso e sem perda de dados; não remover dados publicados.
- Smoke de homologação: backend `/health`, `/ready`, `/ping`, admin `/version` e rota `/moderacao/sugestoes-comunidades` autenticada/sem crash.

## Contrato técnico detalhado

Backend esperado:

- Prisma:
  - `community_suggestion.block_id String? @map("block_id")`.
  - `community_suggestion_block` com `title`, `description`, `status`, `created_by_admin_id`, `community_id` e relações opcionais.
- Migration aditiva aplicada com `pnpm --dir backend db:migrate-prod` após `db:migrate` apontar drift preexistente no banco configurado; nenhum reset foi executado.
- Repositório/service/controller/validator sob módulo real de Moderação Admin.
- Traduções públicas seguras.
- Auditoria em `admin_activity_log` para criar/atualizar bloco, mover e arquivar sugestão.

Admin esperado:

- `admin/src/api/req/moderation`, `admin/src/api/callers/moderation` e `admin/src/api/cache/keys` usando TanStack Query existente.
- Rota App Router em `admin/src/app/(admin)/moderacao/sugestoes-comunidades`.
- UI mobile-first, com tokens de tema e sem `<img>`.
- Controllers existentes de formulário.

Packages usados:

- Somente pacotes já instalados em `PACKAGES.md`: React Hook Form, Zod, TanStack Query, lucide-react e sonner.

## Critérios de aceite

- [x] Admin vê sugestões reais enviadas pelo fluxo existente de usuários.
- [x] Admin cria blocos de demanda internos sem criar comunidade automaticamente.
- [x] Admin move sugestões para dentro/fora dos blocos e vê contadores por bloco.
- [x] Admin altera status do bloco e arquiva sugestões sem apagar dados.
- [x] Filtros por busca, status, bloco, usuário e período funcionam contra dados reais.
- [x] Mutações administrativas geram auditoria segura em `admin_activity_log`.
- [x] UI mobile-first; nenhum `<img>` cru foi usado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Migration aditiva foi aplicada sem erro com `pnpm --dir backend db:migrate-prod`; `pnpm --dir backend db:migrate` foi executado e não houve reset diante de drift preexistente.
- [x] Dados existentes continuam compatíveis; nenhuma migration aplicada foi alterada.
- [x] Envs, ordem de deploy, rollback e smoke de homologação foram registrados; nenhuma env obrigatória nova.
- [x] Contratos toleram aplicações em versões diferentes durante o rollout.
- [x] Formulários/campos usam React Hook Form, Zod e controllers da TASK-02.
- [x] Builder/Quick Copy foi usado quando disponível, ou as imagens locais/screenshot foram citadas.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Versão dos quatro manifests foi incrementada uma vez e permanece sincronizada.
- [x] Commit criado com mensagem convencional.
- [x] Commit e push ocorreram em `homolog`; o deploy de homologação foi comunicado e não houve push direto em `main`.

## Validação executada

- `pnpm --dir backend db:migrate` - executado; bloqueado por drift preexistente em migrations antigas já aplicadas no banco configurado, sem reset.
- `pnpm --dir backend db:migrate-prod` - aplicado com sucesso para a migration aditiva `20260810173000_add_community_suggestion_blocks`.
- `pnpm --dir backend exec prisma migrate status` - schema up to date após aplicação.
- `pnpm --dir backend check` - sem erros.
- `pnpm --dir backend build` - sem erros.
- `pnpm --dir admin check` - sem erros.
- `pnpm --dir admin build` - sem erros.
- `pnpm check` - sem erros.
- Browser local da rota Admin - `http://localhost:3002/moderacao/sugestoes-comunidades` respondeu 200.
- Smoke de homologação após push - executar após publicação do commit.

## Notas de execução

- A task não alterou `/app/comunidades/sugerir` nem o endpoint privado de usuário.
- Builder/Quick Copy não esteve acessível como ferramenta nesta sessão; foram usadas as screenshots enviadas pelo usuário e o padrão visual registrado em `_product/tasks/PROTO-INVENTORY.md`.
- `prisma migrate dev` indicou drift preexistente em migrations antigas aplicadas no banco Supabase configurado; nenhum reset destrutivo foi executado. A migration desta task é apenas expansiva e foi aplicada com `migrate deploy`, seguida de `prisma migrate status` sem pendências.

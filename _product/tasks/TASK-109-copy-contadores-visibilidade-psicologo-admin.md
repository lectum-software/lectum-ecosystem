# TASK-109 - Copy dos contadores de Visibilidade do psicologo Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-109 |
| Prioridade | P2 |
| Esforco | PP |
| Fase | Admin - Psicologos |
| Status | Completed |
| Dependencias | TASK-108 |
| ADR alvo | N/A - ajuste de copy sem decisao arquitetural |

## Contexto

Após a TASK-108, o bloco **Visibilidade** passou a exibir quatro contadores abaixo do grafico temporal na
aba `/psicologos/[id]?tab=estatisticas` do Admin. O produto solicitou refino de copy para deixar claro que
os dois primeiros contadores se referem a views do video de apresentacao e que o contador de conteudo se
refere a conteudo na comunidade.

Referencias consultadas:

- `_product/tasks/README.md`;
- `_product/tasks/ARCHITECTURE.md`;
- `_product/tasks/DATA-MODEL.md`;
- `_product/tasks/PACKAGES.md`;
- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`;
- screenshot enviado na conversa.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, nao ha
ferramenta Builder/Quick Copy callable no ambiente Codex; a validacao visual usa a imagem local, o screenshot
e a rota local do Admin.

## Objetivo

Alterar somente os textos dos contadores do bloco **Visibilidade**, mantendo IDs, fontes, calculos, dados
reais e contrato estrutural da API.

## Escopo

- Backend: ajustar labels retornados em `business.visibility.counters`.
- Frontend/Admin: sem alteracao de componente; os textos sao renderizados a partir do contrato real da API.

## Fora do escopo

- Criar ou alterar endpoint.
- Alterar IDs de contadores.
- Alterar calculos, fontes, schema Prisma, migrations ou packages.
- Criar mock, seed ou dado inventado.

## Criterios de aceite

- [x] `Visualizações nos resultados de busca` foi alterado para `Views do vídeo de apresentação nos resultados de busca`.
- [x] `Visualizações do vídeo no explorar` foi alterado para `Views do vídeo de apresentação no explorar`.
- [x] `Visualizações de conteúdo` foi alterado para `Visualizações de conteúdo na comunidade`.
- [x] IDs, sources e valores dos contadores permanecem inalterados.
- [x] Nenhum mock, package novo, schema Prisma ou migration foi criado.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Browser local do Admin respondeu na rota de estatisticas do psicologo.
- [x] Commit criado com mensagem convencional.

## Validacao minima

- `pnpm --dir backend check` - OK.
- `pnpm --dir backend build` - OK.
- Browser local Admin em `localhost:3002/psicologos/cmrgrztri7000tn0uh1q4n8xf?tab=estatisticas` -
  HTTP 200 via `Invoke-WebRequest`.

## Notas de execucao

- ADR novo nao e necessario porque a task altera apenas copy de labels, sem decisao arquitetural, integracao,
  regra de dominio nova ou trade-off relevante.

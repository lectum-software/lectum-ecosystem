# ADR-0165: Catálogo curado de comunidades com Depressão e TDAH

## Status

Accepted

## Task relacionada

Ajuste complementar das comunidades em `TASK-22`/`TASK-23`, solicitado em 2026-06-25.

## Contexto

O produto redefiniu o catálogo público de comunidades. As comunidades que devem permanecer visíveis são Ansiedade, Relacionamentos e Autocuidado; Mulheres e Luto devem sair das listas públicas; Depressão e TDAH devem entrar nos mesmos locais em que comunidades aparecem.

A UI já tinha listagem, chips, cards, carrossel e páginas internas baseadas em dados reais da API. O catálogo inicial era persistido por migration, então alterar apenas arrays de frontend deixaria rotas, filtros e criação de posts inconsistentes com o backend.

As imagens anexadas pelo usuário são os novos assets oficiais para cada comunidade. Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência visual ativa segue registrada em `_product/tasks/PROTO-INVENTORY.md`, e os assets anexados foram usados apenas como identidade visual das comunidades, mantendo o padrão atual dos cards.

## Decisão

- Manter ativas as comunidades:
  - `ansiedade-em-equilibrio` / Ansiedade em Equilíbrio;
  - `relacionamentos-com-proposito` / Relacionamentos com Propósito;
  - `autocuidado-em-pratica` / Autocuidado em Prática;
  - `depressao` / Depressão;
  - `tdah` / TDAH.
- Remover `mulheres-em-foco` e `luto-e-ressignificacao` das listas públicas por soft delete no banco, preservando histórico e integridade referencial de posts/membros antigos.
- Criar uma migration de dados para upsert do catálogo ativo, associando `avatar_url` e cores visuais cacheadas para evitar depender de extração client-side de paleta.
- Copiar os assets anexados para:
  - `frontend/public/images/community/explore/*.png`, usados nos cards e carrosséis de exploração;
  - `backend/public/community/icons/*.png`, usados como `avatar_url` das comunidades retornadas pela API.
- Atualizar `COMMUNITY_FEED_CHIPS` para chips do feed agregado e navegação por slug somente com o catálogo ativo.
- Atualizar `DATA-MODEL.md` para refletir o catálogo vigente e documentar a remoção por soft delete.

## Consequências

- `/app/community`, `/app/community/feed`, chips de comunidade, criação/edição de posts e páginas internas passam a depender do mesmo catálogo real persistido.
- URLs antigas de Mulheres e Luto deixam de resolver como comunidades ativas porque os endpoints filtram `deleted = false`.
- Dados históricos não são apagados fisicamente, alinhando com a política de soft delete do schema.
- Não houve package novo, mudança de schema Prisma ou endpoint simulado.

## Validação

- `pnpm --dir backend db:migrate` aplicado após remover BOM do arquivo SQL; reexecução retornou banco em sincronia.
- Consulta Prisma local confirmou 5 comunidades ativas com `avatar_url` e `Mulheres/Luto` com `deleted=true`.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- HTTP local no dev server existente:
  - `GET http://127.0.0.1:3000/app/community` retornou `200`;
  - `GET http://127.0.0.1:3000/images/community/explore/depressao.png` retornou `200 image/png`;
  - `GET http://127.0.0.1:3001/community/icons/depressao.png` retornou `200 image/png`.

## Pendências

Nenhuma pendência externa. A primeira tentativa de `db:migrate` falhou por BOM UTF-8 no SQL gerado localmente, não por conflito de dados; o arquivo foi regravado sem BOM e a migration ficou aplicada/sincronizada.
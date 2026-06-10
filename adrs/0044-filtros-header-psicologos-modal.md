# ADR-0044: Acesso a filtros por modal na listagem de psicólogos

## Status

Accepted

## Task relacionada

TASK-13

## Contexto

A rota `/app/psychologists` já possui busca e filtros por parâmetros da URL (`search`, `specialty`, `service`, `approach`), mas não havia um ponto de entrada visual dedicado para abrir/ajustar filtros após a adoção recente do cabeçalho em padrão de páginas.

Para manter consistência com a experiência de favoritos e facilitar o acesso rápido em mobile, decidiu-se reutilizar o padrão de cabeçalho em forma de bloco destacado e substituir a badge de contagem por um disparador de filtros.

## Decisão

- O cabeçalho da tela de psicólogos passa a usar a mesma estrutura visual de cabeçalho do padrão da listagem de favoritos (`PsychologistRelationList`).
- O texto foi alterado para **“Psicólogos”**.
- A badge de “selecionados” foi substituída por um botão com ícone de lupa (`Search`).
- Ao clicar na lupa, abre-se um modal de filtros (overlay), que reutiliza o formulário já padronizado de filtro (`usePsychologistsFilterForm`) com campos:
  - busca textual
  - especialidade
  - serviço
  - abordagem
- A aplicação/remoção de filtros continua atualizando os parâmetros da URL e reseta para página 1 ao aplicar filtros.
- A modal oferece ação de limpar filtros e fechamento por backdrop, botão de fechar e tecla `Escape`.

## Consequências

- Consistência visual com a tela de favoritos e redução de ruído visual no topo da lista.
- Menor abandono de filtros por não exigir links inline no corpo da listagem.
- Introduz dependência de estado local de abertura/fechamento de modal e reutilização de formulário, sem mudança estrutural no backend.
- O fluxo permanece semânticamente no mesmo endpoint e mesmo contrato de query params, mantendo compatibilidade.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Verificação manual da rota `/app/psychologists` (abrir modal de filtros, aplicar e limpar filtros, paginação com filtros mantidos).

## Pendências

- Refinar acessibilidade/foco da modal se necessário (trap de foco completo e restauração do foco no botão de abertura).

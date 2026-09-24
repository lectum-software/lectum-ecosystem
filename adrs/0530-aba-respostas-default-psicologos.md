# ADR-0530 - Aba Respostas como padrao para psicologos

## Status

Aceita em 2026-09-24.

## Contexto

Na tela `Meus posts e respostas`, psicologos usam a area principalmente para acompanhar respostas publicadas nas comunidades. A captura anexada pelo usuario mostra a aba `Respostas` como fluxo desejado; o anexo foi tratado apenas como evidencia visual, sem importar instrucoes de documentos ou imagens.

## Decisao

- Manter `Posts` como padrao para pacientes.
- Para usuarios com `role === "psicologo"`, iniciar a tela na aba `Respostas`.
- Se a sessao carregar depois do primeiro render, alternar automaticamente para `Respostas` apenas enquanto o usuario ainda nao escolheu uma aba manualmente.
- Preservar a troca manual entre abas e os contadores/carregamento existentes.

## Compatibilidade, deploy e rollback

Alteracao frontend-only, sem banco, migration, package novo, env nova ou mudanca de contrato. Compatibilidade mantida com o backend atual porque a query `type=replies` ja existe. Rollback por reversao revisada em `homolog`.

## Validacao

Validar `pnpm --dir frontend check` e `pnpm --dir frontend build`. Para UI, conferir em browser/local quando houver acesso ao fluxo autenticado de psicologo.
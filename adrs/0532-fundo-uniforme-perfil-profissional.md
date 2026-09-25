# ADR-0532 - Fundo uniforme no conteudo do perfil profissional

## Status

Aceita em 2026-09-25.

## Contexto e decisao

Foi identificada uma faixa cinza atras dos cards brancos do perfil profissional publico, a partir da secao `Sobre`. A causa era o wrapper das abas do perfil usando `bg-surface-muted`, enquanto o restante da pagina usa `bg-background`. A decisao foi manter os cards e seus estados internos inalterados e trocar apenas o fundo externo das abas `Geral`, `Publicacoes` e `Avaliacoes` para `bg-background`, removendo a diferenca visual sem criar tokens, componentes ou regras paralelas.

## Impacto e validacao

Alteracao exclusivamente frontend e visual. Sem backend, banco, env, package novo, contrato HTTP ou mock. Mobile-first preservado porque o espacamento, largura e cards existentes foram mantidos. Rollback por reversao revisada em `homolog`. Validar com `pnpm --dir frontend check`, `pnpm --dir frontend build` e inspecao local do perfil profissional.

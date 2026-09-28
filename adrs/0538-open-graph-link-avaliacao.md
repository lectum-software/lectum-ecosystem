# ADR-0538 - Open Graph do link de avaliacao

## Status
Aceito em 2026-09-28.

## Decisao
A rota /app/avaliacoes/nova gera metadata no servidor usando psychologist_id
(ou alias id) e a API publica SEO existente, sem autenticacao do crawler.
Imagem quadrada versionada e descricao sao as mesmas do perfil. O titulo passa
a ser Avalie seguido pelo nome publico. Canonical e og:url permanecem na pagina
de avaliacao com o identificador codificado, nunca no perfil ou login.

## Seguranca e fallback
Noindex/nofollow preservados. A escrita de avaliacoes continua autenticada e
validada pelo backend. Perfil ausente ou falha da API utiliza titulo generico e
fallback de imagem existente, sem expor erros. Consultas publicas mantem timeout.

## Validacao
Testes comparam metadata de perfil e avaliacao, titulo, imagem, descricao,
destino, ausencia de perfil e codificacao da query. Sem banco, env ou pacotes novos.
Dependencias locais sincronizadas por install frozen-lockfile com Next 16.3.3.
Deploy primeiro em homolog; rollback por reversao revisada.

# TASK-199 - Playback de respostas em posts de membros excluidos

## Contexto

Pedido de 01/10/2026: preservar reproducao das respostas em video quando o paciente
autor da pergunta exclui sua conta. A exclusao de conta mantem a discussao publicada,
mas a autorizacao publica do video exigia post.author ativo e nao excluido.
Admin reproduzia os mesmos arquivos; a API publica retornava video_asset_not_found.

## Escopo e aceite

- [x] Remover somente a dependencia da conta do autor da pergunta no playback de respostas.
- [x] Manter resposta nao removida, autor do video ativo, referencia e post correspondentes.
- [x] Manter post publicado/nao removido e comunidade ativa/nao removida.
- [x] Preservar preview do dono e regras de videos de posts/perfil.
- [x] Testar autorizacao de visitante, negacao sem associacao e guardas da consulta.
- [x] Validar checks e compilacao do backend.

## Validacao

Versao 0.1.534. Onze testes no artefato compilado passaram, incluindo quatro novos
que exercitam isPlaybackAuthorized e conferem integralmente a consulta Prisma.
Biome, runtime-deps, build/TypeScript, encoding, secrets, source-safety e ciclos OK.
Suite geral via tsx bloqueada no executor Windows por uv_os_get_passwd/ENOMEM,
antes dos testes; nao considerada aprovada. Nenhum banco real acessado nos testes.
Smoke apos push: verificar /ping, /health e /ready; registrar resultado no relatorio
da sessao. Nao excluir conta real para fabricar um cenario de teste.

## Deploy e rollback

Backend somente; contrato inalterado, sem migration, nova variavel ou dependencia.
Nenhuma conta sera restaurada e nenhum conteudo removido sera republicado.
Validacao inicial em homolog; producao exige promocao solicitada pelo usuario.
Rollback por reversao de codigo, sem restauracao de dados. ADR-0544.

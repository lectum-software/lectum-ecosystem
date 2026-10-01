# ADR-0544 - Playback de respostas apos exclusao do autor da pergunta

Status: aceito. Data: 2026-10-01.

## Contexto

AccountRepository.deleteOwnAccount preserva posts e respostas, ocultando a identidade
do usuario excluido. As consultas publicas de posts tambem preservam essa discussao.
VideoAssetRepository.isPlaybackAuthorized contrariava essa regra ao exigir que o
autor do post pai de uma resposta ainda estivesse ativo e nao excluido.

## Decisao

Na associacao community_reply, nao consultar o estado da conta de post.author.
A autorizacao continua vinculada ao arquivo exato, ao autor ativo da resposta,
ao post/contexto correto e aos estados publicos do post, resposta e comunidade.
Remocoes/moderacao do conteudo continuam bloqueando acesso de visitantes.
As regras de preview do dono, videos de posts e apresentacao de perfil nao mudam.

## Consequencias e seguranca

Respostas preservadas continuam reproduzindo sem restaurar a conta do paciente.
Nenhuma liberacao global de assets, fallback administrativo ou exposicao de originais.
Contrato e URLs assinadas permanecem iguais. Sem migration, env ou dependencia nova.
Testes exercitam o repositorio com delegate Prisma isolado, sem acesso a banco real,
verificando integralmente os filtros e a negacao quando nao ha associacao elegivel.
Rollback reverte a consulta; nenhum dado precisa ser restaurado.

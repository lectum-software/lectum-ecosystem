# ADR-0542 - Conteudo global de psicologos no Admin

Status: aceito. Data: 2026-10-01. Relacionado: TASK-197, TASK-71, TASK-75.

## Decisao

Nova rota `/comunidades/conteudo`, acessivel na sidebar de Comunidades, consome
`GET /api/admin/private/communities/content`. O prefixo especifico e registrado
antes da rota por identificador e recebe o middleware adminAuth padrao.

O repositorio faz UNION ALL parametrizado de community_posts e post_replies,
restringindo ambos a user.role=psicologo e comunidades nao excluidas. Filtros de
texto, nome profissional, comunidade e data sao aplicados no banco. Contagem e
pagina compartilham snapshot RepeatableRead; ordenacao por data/id/tipo. Somente
os IDs da pagina sao hidratados e enriquecidos com metricas. Isso evita carregar
todo o acervo ou chamar um endpoint por comunidade. O historico administrativo
inclui removidos/bloqueados, identificados pelos mapeadores existentes.

Reutilizamos mapeadores de autor/conteudo, nomes cadastrados, players, analytics e
downloads original/com arte. Nao adicionamos acoes em massa, exclusao ou alteracao
de visibilidade. O filtro Psicologo busca nome cadastral/profissional, sem retornar
emails nem dados privados. Formularios seguem RHF/Zod/controllers e URL state.

Estilo neutro inspirado na captura Facebook e aplicado somente nesta rota, com
fonte de sistema, cinza #f0f2f5 e branco. Nao muda o design system global.

## Consequencias

Sem schema/env/pacote novo. Offset tem custo crescente em paginas profundas;
limite de 50 itens e limite de pagina na validacao. Cursor pode ser avaliado se o
volume justificar; nao ha truncamento silencioso do acervo. Reverter codigo e
suficiente para rollback. Dados persistentes e midias permanecem intactos.

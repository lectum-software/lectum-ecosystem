# TASK-197 - Conteudo global dos psicologos no Admin

## Escopo

Pedido de 01/10/2026: Comunidades > Conteudo agrega posts e respostas de todos os
psicologos em todas as comunidades. Refina a exclusao de lista global da TASK-71.
Inspiracao visual: captura do registro de atividades Facebook enviada pelo usuario,
com fundo cinza, superficies brancas, texto escuro, agrupamento cronologico e acoes
compactas. Sidebar e identidade Lectum preservadas; estilo limitado a nova pagina.
Builder/Quick Copy nao esta disponivel como ferramenta nesta sessao. Inventario
PROTO consultado; capturas fornecidas e componentes do Admin sao as referencias.

## Criterios de aceite

- [x] Subaba Conteudo em Comunidades, com rota estatica propria.
- [x] Consulta real exclusiva para autores psicologos, posts e respostas juntos.
- [x] Filtros por texto, nome do psicologo, comunidade, tipo e periodo; ordenacao.
- [x] Paginacao no banco antes de carregar midias e metricas; desempate estavel.
- [x] Nomes das comunidades provenientes do cadastro administrativo.
- [x] Visualizacao, metricas e downloads reutilizam os contratos existentes.
- [x] Estados loading, vazio e erro; filtros e pagina preservados na URL.
- [x] Mobile-first implementado: campos em coluna e progressao para desktop.
- [ ] Checks/builds, testes focados, verificacao visual e smoke homolog registrados.

## Deploy e rollback

Somente homolog nesta task. Contrato aditivo com autenticacao admin existente.
Sem migration, dependencia ou variavel nova. Nenhuma escrita de dados no novo GET.
Rollback: reverter codigo da task; nenhum dado requer restauracao.
ADR-0542 documenta paginacao e reuso.

## Validacao

Admin check e build completos aprovados (um skip preexistente de symlink Windows). Backend:
Biome, runtime-deps, typecheck e build aprovados. Cinco testes novos aprovados no
artefato compilado, incluindo validator HTTP real. Executor tsx local falha antes
dos testes com uv_os_get_passwd/ENOMEM; suite completa nao considerada aprovada.
Banco local nao configurado: Prisma generate/typecheck usa URL local apenas para
compilacao e nao efetua conexao ou alteracao de dados. Source-size e cycles OK.
Validacao visual/autenticada pendente de login do usuario em homologacao.
Inicializacao local via Start-Process foi bloqueada pela politica de execucao;
nao foi contornada. Homologacao sera a proxima superficie de validacao autenticada.

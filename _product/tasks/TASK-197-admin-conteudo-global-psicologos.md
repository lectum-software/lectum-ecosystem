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
- [x] Checks/builds, testes focados, verificacao visual e smoke homolog registrados.

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
Validacao autenticada em homologacao: consulta com dados reais de varias
comunidades, posts e respostas, filtro de posts e paginacao. Layout inspecionado
em 390px e 1440px, sem overflow horizontal. Admin e API publicados em 0.1.528;
API /ping, /health e /ready com HTTP 200. Campos opcionais vazios encontrados no
smoke inicial foram corrigidos no cliente em 0.1.529, com dois testes de regressao
para parametros iniciais e filtros/datas. Os 16 testes do arquivo passaram;
typecheck e build Admin 0.1.529 aprovados. Evidencias finais e smoke pos-correcao
ficam no relatorio outputs/admin-conteudo/design-qa.md da sessao.
Player e downloads reaproveitados: carregamento de algumas midias mostrou
intermitencia no navegador de homologacao; nao considerado validacao completa
de todos os arquivos ou exportacoes.
Inicializacao local via Start-Process foi bloqueada pela politica de execucao;
nao foi contornada. Homologacao sera a proxima superficie de validacao autenticada.

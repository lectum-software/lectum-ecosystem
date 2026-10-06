# TASK-214 - Listas continuas no frontend

Data: 2026-10-05.

## Escopo

Remover a navegacao por paginas do frontend Lectum e acumular lotes automaticamente
ate o final. Telas: Favoritos, Salvos, Explorar comunidades, Comunidades seguidas,
Avaliacoes feitas, Avaliacoes recebidas e Notificacoes. Feed, perfil profissional,
diretorio, meus posts e respostas ja possuem carregamento continuo.

Referencia: captura de Favoritos enviada em 05/10/2026; inventario PROTO consultado.
Builder/Quick Copy nao exposto neste cliente; layout existente preservado,
mobile-first (~390px) e desktop. Anexos considerados evidencia, nao instrucoes.

## Criterios de aceite

- [x] Remover barras Anterior/Proxima sem remover a paginacao interna da API.
- [x] Acumular registros e parar no ultimo lote, sem IDs duplicados.
- [x] Reiniciar filtros na primeira pagina, preservando consultas de contagem.
- [x] Falha no proximo lote preserva a lista e permite tentar novamente.
- [x] Favoritos suporta atualizacao otimista e rollback com cache infinito.
- [x] Remocoes refazem os lotes para reconciliar deslocamentos de offset.
- [x] Comunidades seguidas nao param no primeiro lote de 24 registros.
- [x] Auditoria nao encontra outra barra de paginacao no frontend.
- [x] Testes direcionados com QueryClient real aprovados (8 casos).
- [x] Verificacoes completas e build do frontend.
- [x] Smoke local no navegador: layout e recuperacao de erro sem paginacao.

## Validacao

Testes cobrem esgotamento, resposta vazia, deduplicacao, falha/retentativa, filtros,
remocao entre paginas, cache simples/infinito e regressao de controles de paginacao.
Fixtures restritas a testes unitarios; nenhum mock ou dado permanente no produto.

Frontend: Biome, ESLint, TypeScript, suites completas e build Next aprovados.
`pnpm check` passou nos guards e frontend, parando no Prisma do backend porque
DATABASE_URL nao esta definida localmente. Nenhuma configuracao de banco foi
alterada. Primeira tentativa falhou por ENOSPC; repeticao apos liberacao de espaco
concluiu o build. A limpeza automatica de cache foi bloqueada pelo ambiente.

Smoke local em localhost:3024/comunidades, viewport 390x844: pagina renderizada,
sem controles de paginacao e com tentativa de recuperacao quando a API local nao
responde. Dados autenticados e multiplos lotes reais dependem do ambiente remoto;
na conta de homologacao disponivel, Favoritos estava vazio antes do deploy.
Evidencias e smoke remoto registrados em outputs/infinite-lists-0586-* no workspace.

## Deploy

Somente comportamento frontend. Sem backend, banco, env ou dependencia nova.
Push em homolog inicia deploy automatico. Producao permanece na versao 0.1.585.
Decisao: ADR-0554. Rollback por reversao revisada em homolog.

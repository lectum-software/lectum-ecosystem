# TASK-239 - Comunidades seguidas na familia visual da Lectum

## Escopo

Reorganizar a tela `Comunidades seguidas` a partir das referencias enviadas em
09/10/2026 e dos componentes atuais de Inicio, Salvos e Favoritos. Remover a
composicao promocional exclusiva da tela, preservar a consulta real e aproximar
tipografia, superficies, espacamentos e recomendacoes do padrao vigente.
ADR-0579. PROTO-INVENTORY e `_product/proto/Seguindo.jpg` consultados; a referencia
historica explica a composicao anterior, mas as capturas atuais definem a familia
visual aprovada. Builder/Quick Copy nao esta exposto neste cliente.

Durante a QA visual, uma URL remota invalida exibiu o texto alternativo dentro do
card. O avatar compartilhado agora troca imagens ausentes ou com erro por iniciais,
sem alterar o contrato da API.

## Aceite

- [x] Cabecalho continua no mesmo componente usado por Salvos.
- [x] Resumo de atividade fica discreto e nao ocupa um card proprio.
- [x] Banner Em destaque e duplicacao da primeira comunidade sao removidos.
- [x] Comunidades seguidas usam lista compacta, avatar real, nome completo e atividade.
- [x] Recomendacoes reutilizam o carrossel compartilhado do Inicio.
- [x] Mobile 390px e desktop 1280px validados no navegador local.
- [x] Checks e build finais validados depois do fallback compartilhado de avatar.

## Evidencia visual

`design-qa.md` registra comparacao conjunta, capturas mobile/desktop e a iteracao
que corrigiu o avatar remoto quebrado. Resultado visual: `passed`.

## Validacao

- `pnpm --dir frontend test:community-recommendations`: 16/16.
- `pnpm --dir frontend check`: aprovado; teste de symlink ignorado pela permissao do Windows.
- `pnpm --dir frontend build`: aprovado, incluindo `/app/comunidades-seguidas`.
- Browser local: 390 x 844 e 1280 x 900, sem P0/P1/P2 pendente.
- `check:version`, `check:secrets`, `check:encoding`, `check:adrs`, `check:tasks`
  e `check:source-safety`: aprovados. Versao sincronizada em `0.1.611`.

## Impacto de deploy

Frontend apenas. Sem backend, banco, migration, env, package novo ou mudanca de
contrato. A API e a paginacao existentes sao preservadas. Rollback por reversao
do componente e dos documentos desta task. Commit local em `homolog`; sem push ou
deploy ate autorizacao explicita.

# ADR-0596: Contagem somente com filtros efetivos

Status: aceita. Data: 2026-10-11. Task: TASK-13.

## Decisao

Reutilizar normalizacao do formulario RHF para detectar criterios efetivos. Sem criterios, nao renderizar selo nem consultar previa da contagem. Com criterios, preservar count real da API e protecao contra resultados antigos. Limpar oculta imediatamente mesmo durante debounce. Nao altera a listagem nem promete ocultar totais em outros contratos; escopo e o botao.

## Deploy

Somente frontend, compativel com API atual, sem migrations/env/packages. Rollback por reversao do frontend. Sem push ou deploy.

## Validacao

Mobile-first 390px e desktop; captura do usuario e padroes locais, Builder indisponivel. Regressoes de consulta, normalizacao e apresentacao. Check completo e build aprovados; browser 390px/desktop confirmou ausencia de selo sem criterios, carregamento/(0) real com Online e ausencia apos limpar/reabrir.
